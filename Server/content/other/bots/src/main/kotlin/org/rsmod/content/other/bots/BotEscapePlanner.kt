package org.rsmod.content.other.bots

import org.rsmod.map.CoordGrid

/** Only proposes real reachable tiles; never teleports or bypasses doors/collision. */
internal object BotEscapePlanner {
    fun destination(
        origin: CoordGrid,
        threats: List<CoordGrid>,
        canWalk: (CoordGrid, CoordGrid) -> Boolean,
        occupied: (CoordGrid) -> Boolean = { false },
    ): CoordGrid? {
        val samePlane = threats.filter { it.level == origin.level }
        if (samePlane.isEmpty()) return null
        val before = samePlane.minOf { it.chebyshevDistance(origin) }
        val options = mutableListOf<CoordGrid>()
        for (distance in listOf(12, 9, 6, 4)) {
            for (dx in -distance..distance step 3) for (dz in -distance..distance step 3) {
                if (maxOf(kotlin.math.abs(dx), kotlin.math.abs(dz)) < distance - 2) continue
                options.add(CoordGrid(origin.x + dx, origin.z + dz, origin.level))
            }
        }
        return options.asSequence()
            .filter { !occupied(it) }
            .map { dest -> dest to samePlane.minOf { it.chebyshevDistance(dest) } }
            .filter { (_, separation) -> separation >= before + 3 && separation >= 5 }
            .sortedByDescending { it.second * 100 - origin.chebyshevDistance(it.first) }
            .map { it.first }
            .firstOrNull { canWalk(origin, it) }
    }
}
