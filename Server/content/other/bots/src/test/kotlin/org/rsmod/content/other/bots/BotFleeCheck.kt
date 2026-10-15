package org.rsmod.content.other.bots

import org.rsmod.map.CoordGrid
import org.rsmod.routefinder.RouteFinding
import org.rsmod.routefinder.collision.CollisionFlagMap
import org.rsmod.routefinder.flag.CollisionFlag

object BotFleeCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        check(BotFleePlanner.shouldInterrupt(BotMode.Skilling, BotTaskKind.Woodcutting))
        check(BotFleePlanner.shouldInterrupt(BotMode.Progressive, BotTaskKind.Mining))
        check(!BotFleePlanner.shouldInterrupt(BotMode.Progressive, BotTaskKind.Combat))
        check(!BotFleePlanner.shouldInterrupt(BotMode.Combat, BotTaskKind.Woodcutting))
        check(!BotFleePlanner.shouldInterrupt(BotMode.Wilderness, BotTaskKind.Woodcutting))
        check(!BotFleePlanner.shouldInterrupt(BotMode.ClanOne, BotTaskKind.Woodcutting))

        val wizard = CoordGrid(3210, 3420, 0)
        val victim = CoordGrid(3212, 3420, 0)
        val found = BotFleePlanner.destination(victim, listOf(wizard), emptySet()) { _, _ -> true }
        check(found != null && found.chebyshevDistance(wizard) > victim.chebyshevDistance(wizard)) {
            "Retreat must increase distance from the attacker"
        }
        check(found.level == victim.level)
        check(BotFleePlanner.destination(victim, emptyList(), emptySet()) { _, _ -> true } == null)
        check(BotFleePlanner.destination(victim, listOf(wizard), emptySet()) { _, _ -> false } == null)

        val twoAttackers = listOf(wizard, CoordGrid(3210, 3430, 0))
        val groupRetreat = BotFleePlanner.destination(victim, twoAttackers, emptySet()) { _, _ -> true }
        check(groupRetreat != null && twoAttackers.all {
            groupRetreat.chebyshevDistance(it) > victim.chebyshevDistance(it)
        }) { "Group retreat must get farther from all active attackers" }
        val occupied = listOf(CoordGrid(3228, 3420, 0), CoordGrid(3228, 3436, 0)).toSet()
        val avoiding = BotFleePlanner.destination(victim, listOf(wizard), occupied) { _, _ -> true }
        check(avoiding !in occupied) { "Do not stand on another player's tile" }

        check(!BotFleePlanner.safeToResume(15, 12, false, victim, listOf(wizard)))
        check(!BotFleePlanner.safeToResume(100, 50, true, found, listOf(wizard)))
        check(BotFleePlanner.safeToResume(100, 50, false, found, listOf(wizard)))
        check(!BotFleePlanner.safeToResume(100, 50, false, victim, listOf(wizard)))

        check(!BotFleePlanner.safeResource(victim, listOf(wizard)))
        check(!BotFleePlanner.safeResource(wizard.translate(17, 0), listOf(wizard)))
        check(BotFleePlanner.safeResource(wizard.translate(18, 0), listOf(wizard)))
        check(!BotFleePlanner.safeResource(wizard.translate(18, 0),
            listOf(wizard, wizard.translate(19, 0))))
        check(BotFleePlanner.safeResource(CoordGrid(wizard.x, wizard.z, 1), listOf(wizard)))
        check(BotFleePlanner.safeResource(victim, emptyList()))

        val collision = CollisionFlagMap()
        for (x in 3184..3264 step 8) for (z in 3376..3456 step 8) {
            collision.allocateIfAbsent(x, z, 0)
        }
        val routes = RouteFinding(collision)
        val blocked = CoordGrid(3228, 3420, 0)
        collision.add(blocked.x, blocked.z, blocked.level, CollisionFlag.LOC)
        fun canWalk(from: CoordGrid, to: CoordGrid): Boolean =
            from.level == to.level && routes.findRoute(
                level = from.level, srcX = from.x, srcZ = from.z,
                destX = to.x, destZ = to.z, moveNear = false
            ).success
        val pathable = BotFleePlanner.destination(victim, listOf(wizard), emptySet(), ::canWalk)
        check(pathable != null && pathable != blocked && canWalk(victim, pathable)) {
            "Escape should only target collision-reachable tiles"
        }
        println("BotFleeCheck OK: NPC-only escape, separation, collision and recovery")
    }
}
