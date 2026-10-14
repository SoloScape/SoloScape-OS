package org.rsmod.content.other.bots

import org.rsmod.map.CoordGrid

/**
 * Escape only from actual attacks: the caller supplies positions of NPCs that have
 * hit the bot. The normal routefinder is authoritative; never force coordinates or
 * teleport through walls. This code does not apply to intentional combat training.
 */
internal object BotFleePlanner {
    const val SAFE_DISTANCE = 16
    const val CLEAR_CYCLES = 25
    const val RETREAT_COOLDOWN = 1200

    private val offsets = listOf(
        1 to 0, 1 to 1, 0 to 1, -1 to 1, -1 to 0, -1 to -1, 0 to -1, 1 to -1,
    )

    fun shouldInterrupt(mode: BotMode, task: BotTaskKind): Boolean =
        mode in setOf(BotMode.Skilling, BotMode.Progressive) && task != BotTaskKind.Combat

    fun safeToResume(
        cycle: Int,
        lastHit: Int,
        inCombat: Boolean,
        position: CoordGrid,
        threats: List<CoordGrid>,
    ): Boolean =
        !inCombat && cycle - lastHit >= CLEAR_CYCLES &&
            threats.isNotEmpty() && threats.all {
                it.level != position.level || position.chebyshevDistance(it) >= SAFE_DISTANCE
            }

    fun safeResource(position: CoordGrid, threats: List<CoordGrid>): Boolean =
        threats.all { it.level != position.level ||
            position.chebyshevDistance(it) >= SAFE_DISTANCE + 2 }

    fun destination(
        origin: CoordGrid,
        threats: List<CoordGrid>,
        occupied: Set<CoordGrid>,
        canWalk: (CoordGrid, CoordGrid) -> Boolean,
    ): CoordGrid? {
        val danger = threats.filter { it.level == origin.level }
        if (danger.isEmpty()) return null
        val currentGap = danger.minOf { origin.chebyshevDistance(it) }
        var best: CoordGrid? = null
        var bestScore = Int.MIN_VALUE
        for (radius in listOf(7, 11, 16)) {
            for ((dx, dz) in offsets) {
                val candidate = CoordGrid(origin.x + dx * radius, origin.z + dz * radius,
                    origin.level)
                if (candidate.x < 0 || candidate.z < 0 || candidate in occupied) continue
                val gap = danger.minOf { candidate.chebyshevDistance(it) }
                if (gap <= currentGap + 2) continue
                if (!canWalk(origin, candidate)) continue
                // Keep away from *all* recorded aggressors, not just the last hit.
                // Reward clearance heavily, but prefer shorter escapes once far enough.
                val score = minOf(gap, SAFE_DISTANCE + 6) * 10 - radius * 2
                if (score > bestScore) {
                    bestScore = score
                    best = candidate
                }
            }
        }
        return best
    }
}
