package org.rsmod.content.other.bots

import com.fasterxml.jackson.databind.ObjectMapper
import com.github.michaelbull.logging.InlineLogger
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/** Only immutable, explicitly selected bot state crosses onto the file-writing thread. */
internal class BotDebugger(private val output: Path = Path.of("build", "bot-debug", "snapshot.json")) {
    private val logger = InlineLogger()
    private val mapper = ObjectMapper()
    private val pending = AtomicReference<String?>()
    private var worker: ScheduledExecutorService? = null
    private val observations = LinkedHashMap<String, Observation>()
    private var lastExport = Int.MIN_VALUE
    var enabled = false
        private set

    private class Observation(var position: String, var xp: Long, var progressCycle: Int) {
        var state = ""
        val history = ArrayDeque<Map<String, Any?>>()
    }

    fun start() {
        if (enabled) return
        observations.clear()
        lastExport = Int.MIN_VALUE
        worker = Executors.newSingleThreadScheduledExecutor { task ->
            Thread(task, "bot-debug-export").apply { isDaemon = true }
        }.also { executor ->
            executor.scheduleWithFixedDelay({
                pending.getAndSet(null)?.let { json ->
                    try { writeSnapshot(output, json) }
                    catch (error: Exception) { logger.error(error) { "Could not export bot diagnostics" } }
                }
            }, 0, 1, TimeUnit.SECONDS)
        }
        enabled = true
    }

    fun stop() {
        enabled = false
        worker?.shutdownNow()
        worker = null
        pending.set(null)
        observations.clear()
    }

    fun snapshot(cycle: Int, bots: List<Map<String, Any?>>): String? {
        if (!enabled) return null
        val names = bots.map { it.getValue("name") as String }.toSet()
        observations.keys.retainAll(names)
        val rows = bots.map { bot ->
            val name = bot.getValue("name") as String
            val position = bot.getValue("position") as String
            val xp = bot.getValue("totalXp") as Long
            val previous = observations.getOrPut(name) { Observation(position, xp, cycle) }
            if (position != previous.position || xp != previous.xp) previous.progressCycle = cycle
            previous.position = position
            previous.xp = xp
            val state = listOf(bot["task"], bot["phase"], bot["status"], bot["returnReason"],
                bot["selection"], bot["delayed"], bot["protected"]).toString()
            if (state != previous.state) {
                previous.state = state
                previous.history.addLast(mapOf("cycle" to cycle, "position" to position,
                    "task" to bot["task"], "phase" to bot["phase"], "status" to bot["status"],
                    "returnReason" to bot["returnReason"], "selection" to bot["selection"]))
                while (previous.history.size > 16) previous.history.removeFirst()
            }
            bot + mapOf("idleSeconds" to ((cycle - previous.progressCycle) * 0.6),
                "history" to previous.history.toList())
        }
        if (lastExport != Int.MIN_VALUE && cycle - lastExport < 10) return null
        lastExport = cycle
        return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(mapOf(
            "enabled" to true, "cycle" to cycle, "capturedAt" to java.time.Instant.now().toString(),
            "bots" to rows)).also { pending.set(it) }
    }

    companion object {
        internal fun writeSnapshot(output: Path, json: String) {
            Files.createDirectories(output.parent)
            val temporary = output.resolveSibling("snapshot.tmp")
            Files.writeString(temporary, json)
            Files.move(temporary, output, StandardCopyOption.REPLACE_EXISTING,
                StandardCopyOption.ATOMIC_MOVE)
        }
    }
}
