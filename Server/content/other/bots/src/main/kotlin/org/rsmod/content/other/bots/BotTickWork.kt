package org.rsmod.content.other.bots

internal object BotDecisionTiming {
    fun next(cycle: Int, identity: Int, delay: Int = 3): Int {
        val earliest = cycle + delay
        return earliest + Math.floorMod(identity - earliest, 3)
    }

    fun retryDelay(failures: Int, jitter: Int): Int =
        (10 shl (failures - 1).coerceIn(0, 4)).coerceAtMost(100) + jitter.coerceIn(0, 9)
}

/**
 * Fairly rotate the population each tick and issue already planned travel before
 * expensive fresh task selections. The caller uses separate capped routing budgets
 * for the two groups; neither group can starve the other.
 */
internal object BotDecisionScheduling {
    fun <T> ordered(population: List<T>, cursor: Int, travelling: (T) -> Boolean): List<T> {
        if (population.isEmpty()) return emptyList()
        val offset = Math.floorMod(cursor, population.size)
        val rotated = List(population.size) { population[(offset + it) % population.size] }
        return rotated.filter(travelling) + rotated.filterNot(travelling)
    }
}

internal object BotCandidateOrder {
    fun <T> resume(targets: List<T>, deferred: Any?, key: (T) -> Any): List<T> {
        val offset = targets.indexOfFirst { key(it) == deferred }
        return if (offset <= 0) targets else targets.drop(offset) + targets.take(offset)
    }
}

/** Admission budget between decisions; an in-flight native road search completes normally. */
internal class BotTickWork(
    private val maxSearches: Int = 256,
    private val maxNanos: Long = 60_000_000,
    private val clock: () -> Long = System::nanoTime,
) {
    private var active = false
    private var searches = 0
    private var nanos = 0L

    val available: Boolean get() = !active || (searches < maxSearches && nanos < maxNanos)

    fun beginTick() {
        active = true
        searches = 0
        nanos = 0
    }

    fun endTick() { active = false }

    fun <T> search(block: () -> T): T {
        val start = clock()
        try {
            return block()
        } finally {
            if (active) {
                searches++
                nanos += clock() - start
            }
        }
    }
}

internal class BotOccupancy<Owner : Any, Tile : Any> {
    private val positions = HashMap<Owner, Tile>()
    private val destinations = HashMap<Owner, Tile>()
    private val counts = HashMap<Tile, Int>()

    fun snapshot(actors: Sequence<Pair<Owner, Tile>>) {
        positions.clear()
        counts.clear()
        for ((owner, tile) in actors) {
            positions[owner] = tile
            add(tile)
        }
        destinations.values.forEach(::add)
    }

    fun reserve(owner: Owner, tile: Tile) {
        release(owner)
        destinations[owner] = tile
        add(tile)
    }

    fun release(owner: Owner) { destinations.remove(owner)?.let(::subtract) }

    fun remove(owner: Owner) {
        release(owner)
        positions.remove(owner)?.let(::subtract)
    }

    fun excluding(owner: Owner?): Set<Tile> = object : AbstractSet<Tile>() {
        override fun contains(element: Tile): Boolean =
            (counts[element] ?: 0) >
                (if (positions[owner] == element) 1 else 0) +
                (if (destinations[owner] == element) 1 else 0)

        override val size: Int get() = counts.keys.count(::contains)
        override fun iterator(): Iterator<Tile> = counts.keys.filter(::contains).iterator()
    }

    private fun add(tile: Tile) { counts[tile] = (counts[tile] ?: 0) + 1 }
    private fun subtract(tile: Tile) {
        val count = counts.getValue(tile)
        if (count == 1) counts.remove(tile) else counts[tile] = count - 1
    }
}
