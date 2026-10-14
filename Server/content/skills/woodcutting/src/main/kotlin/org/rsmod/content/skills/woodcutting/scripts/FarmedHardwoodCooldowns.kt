package org.rsmod.content.skills.woodcutting.scripts

import org.rsmod.api.attr.AttributeKey
import org.rsmod.game.entity.Player
import org.rsmod.map.CoordGrid

/**
 * A farmed hardwood cannot share the natural tree's world-wide stump: each owner must
 * deplete and recover their own tree. Persist deadlines rather than game cycles so a
 * player's cooldown survives logging out or restarting the world.
 *
 * The native Farming tree-patch growth/visual lifecycle is a separate missing feature.
 * Until it exists, this guards the mature Chop operation without replacing shared locs.
 */
internal object FarmedHardwoodCooldowns {
    private val deadlines = AttributeKey<String>(persistenceKey = "woodcutting_farmed_hardwood")

    fun remainingMillis(player: Player, coords: CoordGrid, now: Long = System.currentTimeMillis()): Long {
        return (parse(player.attr[deadlines])[key(coords)] ?: 0L)
            .minus(now)
            .coerceAtLeast(0L)
    }

    fun deplete(
        player: Player,
        coords: CoordGrid,
        respawnTicks: Int,
        now: Long = System.currentTimeMillis(),
    ) {
        require(respawnTicks > 0)
        val active = parse(player.attr[deadlines]).filterValues { it > now }.toMutableMap()
        active[key(coords)] = now + respawnTicks.toLong() * MILLIS_PER_TICK
        player.attr[deadlines] = encode(active)
    }

    internal fun key(coords: CoordGrid): String = "${coords.level},${coords.x},${coords.z}"

    internal fun parse(encoded: String?): Map<String, Long> {
        if (encoded.isNullOrEmpty()) return emptyMap()
        return encoded.split(';').mapNotNull { entry ->
            val delimiter = entry.indexOf('=')
            if (delimiter <= 0) return@mapNotNull null
            val until = entry.substring(delimiter + 1).toLongOrNull() ?: return@mapNotNull null
            entry.substring(0, delimiter) to until
        }.toMap()
    }

    internal fun encode(values: Map<String, Long>): String =
        values.entries.joinToString(";") { (key, until) -> "$key=$until" }

    private const val MILLIS_PER_TICK = 600L
}
