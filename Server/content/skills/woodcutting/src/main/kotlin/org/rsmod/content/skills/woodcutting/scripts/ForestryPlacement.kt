package org.rsmod.content.skills.woodcutting.scripts

import org.rsmod.map.CoordGrid
import org.rsmod.routefinder.RouteFinding
import org.rsmod.routefinder.collision.CollisionFlagMap
import org.rsmod.routefinder.flag.CollisionFlag

internal class ForestryPlacement(private val flags: CollisionFlagMap) {
    private val routes = RouteFinding(flags)

    fun clear(at: CoordGrid, width: Int, length: Int): Boolean =
        (0 until width).all { x -> (0 until length).all { z ->
            flags[at.x + x, at.z + z, at.level] and BLOCKED == 0
        } }

    fun reachable(from: CoordGrid, at: CoordGrid): Boolean =
        from.level == at.level && routes.findRoute(
            level = from.level, srcX = from.x, srcZ = from.z,
            destX = at.x, destZ = at.z, moveNear = false,
        ).success

    fun path(from: CoordGrid, at: CoordGrid): List<CoordGrid>? {
        if (from.level != at.level) return null
        val route = routes.findRoute(level = from.level, srcX = from.x, srcZ = from.z,
            destX = at.x, destZ = at.z, moveNear = false)
        return if (route.success) route.map { CoordGrid(it.x, it.z, it.level) } else null
    }

    fun candidates(origin: CoordGrid, slot: Int, roots: Boolean): List<CoordGrid> {
        val offsets = if (roots) {
            (-ROOT_RADIUS..ROOT_RADIUS).flatMap { x ->
                (-ROOT_RADIUS..ROOT_RADIUS).map { z -> x to z }
            }
                .filter { (x, z) -> x != 0 || z != 0 }
                .sortedBy { (x, z) -> x * x + z * z }
        } else {
            (-6..6).flatMap { x -> (-6..6).map { z -> x to z } }
                .filter { (x, z) -> x != 0 || z != 0 }
                .sortedBy { (x, z) -> x * x + z * z }
        }
        val shift = (if (roots) slot * 13 else slot * 3) % offsets.size
        return (offsets.drop(shift) + offsets.take(shift)).map { (x, z) ->
            origin.translate(x, z)
        }
    }

    companion object {
        // Rising Roots occupies a 5x5 grid centred on the tree, excluding its tile.
        const val ROOT_RADIUS = 2
        const val ROOT_TILE_COUNT = (ROOT_RADIUS * 2 + 1) * (ROOT_RADIUS * 2 + 1) - 1

        private const val BLOCKED = CollisionFlag.LOC or CollisionFlag.GROUND_DECOR or
            CollisionFlag.BLOCK_WALK or CollisionFlag.BLOCK_PLAYERS
    }
}
