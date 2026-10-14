package org.rsmod.content.other.bots

import org.rsmod.map.CoordGrid
import org.rsmod.routefinder.RouteFinding
import org.rsmod.routefinder.collision.CollisionFlagMap
import org.rsmod.routefinder.flag.CollisionFlag

object BotMovementCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val east = CoordGrid(3268, 3228, 0)
        val west = CoordGrid(3267, 3228, 0)
        for ((entry, exit) in listOf(east to west, west to east)) {
            val origin = entry.translate(0, -16)
            val path = listOf(entry, exit, exit.translate(0, 10))
            check(!BotRoutes.reached(origin, path, 0, entry.translate(0, -1)))
            check(BotRoutes.reached(origin, path, 0, entry))
            check(!BotRoutes.reached(origin, path, 1, entry))
            check(BotRoutes.reached(origin, path, 1, exit))
            check(BotRoutes.reached(origin, path, 2, exit.translate(0, 9)))
            check(BotRoutes.traversal(entry, exit)?.option == "Pay-toll(10gp)")
        }
        val collision = CollisionFlagMap()
        for (x in 3184..3280 step 8) for (z in 3184..3280 step 8) {
            collision.allocateIfAbsent(x, z, 0)
        }
        val routes = RouteFinding(collision)
        fun canWalk(from: CoordGrid, to: CoordGrid) = from.level == to.level &&
            routes.findRoute(level = from.level, srcX = from.x, srcZ = from.z,
                destX = to.x, destZ = to.z, moveNear = false).success
        for (z in 3184..3287) {
            collision.add(3267, z, 0, CollisionFlag.WALL_EAST)
            collision.add(3268, z, 0, CollisionFlag.WALL_WEST)
        }
        val path = BotRoutes.path(east.translate(1, 0), west.translate(-1, 0), ::canWalk)
        check(path.isNotEmpty())
        check((listOf(east.translate(1, 0)) + path).zipWithNext().any { (a, b) ->
            BotRoutes.traversal(a, b) != null
        }) { "Closed gates must be traversed instead of bypassed by geometric links" }
        check(!canWalk(east, west))
        val blocked = setOf(east to west, west to east)
        check(BotRoutes.path(east.translate(1, 0), west.translate(-1, 0),
            ::canWalk, blocked).isEmpty()) {
            "Failed crossings must not be selected again while the wall remains closed"
        }
        for (z in 3184..3287) {
            collision.remove(3267, z, 0, CollisionFlag.WALL_EAST)
            collision.remove(3268, z, 0, CollisionFlag.WALL_WEST)
        }
        check(canWalk(east, west))
        check(BotRoutes.path(east, west, ::canWalk) == listOf(west))
        check(BotRoutes.path(CoordGrid(1, 1, 0), CoordGrid(2, 1, 0), canWalk = { _, _ -> false }).isEmpty())
        val stranded = CoordGrid(2830, 3536, 0)
        val bank = CoordGrid(3184, 3435, 0)
        val rejoined = BotRoutes.path(stranded, bank, canWalk = { from, to ->
            from.level == to.level && from.chebyshevDistance(to) <= 50
        })
        check(rejoined.isNotEmpty() && rejoined.last() == bank) {
            "A stranded endpoint more than 25 tiles from roads must be able to rejoin"
        }
        check(BotRoutes.path(stranded, bank, { _, _ -> false }).isEmpty()) {
            "Wider endpoint connections must still respect collision"
        }
        val timeout = BotProgressTimeout()
        check(!timeout.expired(0, east, 0, true))
        check(!timeout.expired(199, east, 0, true))
        check(timeout.expired(200, east, 0, true))
        check(!timeout.expired(201, west, 0, true))
        check(!timeout.expired(400, west, 1, true))
        check(!timeout.expired(599, west, 1, true))
        check(timeout.expired(600, west, 1, true))
        check(!timeout.expired(601, west, 1, false))
        check(!timeout.expired(602, west, 1, true))
        println("Bot movement checks passed: exact crossings, collision detours and protected progress timeout.")
    }
}
