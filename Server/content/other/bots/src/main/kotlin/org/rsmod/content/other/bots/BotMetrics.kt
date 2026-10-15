package org.rsmod.content.other.bots

import com.github.michaelbull.logging.InlineLogger
import java.lang.management.ManagementFactory

internal object BotMetrics {
    private val logger = InlineLogger()
    private val runtime = Runtime.getRuntime()
    private val allocator = runCatching {
        (ManagementFactory.getThreadMXBean() as? com.sun.management.ThreadMXBean)
            ?.takeIf { it.isThreadAllocatedMemorySupported }
            ?.also { it.isThreadAllocatedMemoryEnabled = true }
    }.getOrNull()
    private var enabled = false
    var measuring = false
        private set
    private var startAt = 0
    private var measuredTicks = 0
    private var tickTimes = LongArray(0)
    private var allocations = LongArray(0)
    private var botTimes = LongArray(0)
    private var botSamples = 0
    private var droppedSamples = 0
    private var tickStart = 0L
    private var allocationStart = -1L
    private var heapPeak = 0L
    private var routeSearches = 0L
    private var routeNanos = 0L
    private var resourceScans = 0L
    private var eligibilityRefreshes = 0L
    private var supplyRefreshes = 0L
    private var gcStart = 0L
    private var complete: ((List<String>) -> Unit)? = null

    fun start(cycle: Int, ticks: Int, warmup: Int, callback: (List<String>) -> Unit): Boolean {
        require(ticks in 1..5000 && warmup in 0..1000)
        if (enabled) return false
        tickTimes = LongArray(ticks)
        allocations = LongArray(ticks) { -1 }
        botTimes = LongArray(minOf(250_000, ticks * 2000))
        startAt = cycle + warmup
        measuredTicks = 0
        botSamples = 0
        droppedSamples = 0
        heapPeak = 0
        routeSearches = 0
        routeNanos = 0
        resourceScans = 0
        eligibilityRefreshes = 0
        supplyRefreshes = 0
        complete = callback
        enabled = true
        return true
    }

    fun beginTick(cycle: Int) {
        measuring = enabled && cycle >= startAt
        if (!measuring) return
        if (measuredTicks == 0) gcStart = gcMillis()
        tickStart = System.nanoTime()
        allocationStart = allocatedBytes()
    }

    fun endTick(bots: Int) {
        if (!measuring) return
        tickTimes[measuredTicks] = System.nanoTime() - tickStart
        val allocated = allocatedBytes()
        if (allocationStart >= 0 && allocated >= allocationStart) {
            allocations[measuredTicks] = allocated - allocationStart
        }
        heapPeak = maxOf(heapPeak, runtime.totalMemory() - runtime.freeMemory())
        measuredTicks++
        if (measuredTicks < tickTimes.size) return
        val report = listOf(
            "Bot performance: bots=$bots ticks=$measuredTicks",
            "Population ms: ${stats(tickTimes, 1_000_000.0)}",
            "Bot tick us: ${stats(botTimes.copyOf(botSamples), 1000.0)} " +
                "samples=$botSamples dropped=$droppedSamples",
            "Game-thread allocation KB/tick: " +
                stats(allocations.filter { it >= 0 }.toLongArray(), 1024.0),
            "Routing: searches=$routeSearches totalMs=${routeNanos / 1_000_000.0} " +
                "resourceScans=$resourceScans",
            "Activity cache: eligibilityRefreshes=$eligibilityRefreshes " +
                "supplyRefreshes=$supplyRefreshes",
            "Heap: peakMB=${heapPeak / 1048576} maxMB=${runtime.maxMemory() / 1048576} " +
                "gcMs=${gcMillis() - gcStart}",
        )
        val callback = complete
        stop()
        report.forEach { logger.info { it } }
        callback?.invoke(report)
    }

    fun recordBot(nanos: Long) {
        if (!measuring) return
        if (botSamples < botTimes.size) botTimes[botSamples++] = nanos else droppedSamples++
    }

    fun route(nanos: Long) {
        if (!measuring) return
        routeSearches++
        routeNanos += nanos
    }

    fun scan() { if (measuring) resourceScans++ }
    fun eligibilityRefresh() { if (measuring) eligibilityRefreshes++ }
    fun supplyRefresh() { if (measuring) supplyRefreshes++ }

    fun stop() {
        enabled = false
        measuring = false
        complete = null
        tickTimes = LongArray(0)
        allocations = LongArray(0)
        botTimes = LongArray(0)
    }

    internal fun stats(values: LongArray, divisor: Double): String {
        if (values.isEmpty()) return "unavailable"
        val sorted = values.sortedArray()
        fun percentile(percent: Int) = sorted[((sorted.size - 1) * percent) / 100] / divisor
        return "avg=%.2f p50=%.2f p95=%.2f p99=%.2f max=%.2f".format(
            sorted.average() / divisor, percentile(50), percentile(95), percentile(99),
            sorted.last() / divisor,
        )
    }

    private fun allocatedBytes(): Long = runCatching {
        allocator?.currentThreadAllocatedBytes ?: -1
    }.getOrDefault(-1)

    private fun gcMillis(): Long = ManagementFactory.getGarbageCollectorMXBeans()
        .sumOf { it.collectionTime.coerceAtLeast(0) }
}
