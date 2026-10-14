package org.rsmod.content.other.bots

import dev.openrune.types.ObjectServerType
import org.rsmod.game.loc.LocEntity
import org.rsmod.game.loc.LocInfo
import org.rsmod.map.CoordGrid
import org.rsmod.map.zone.ZoneKey
import org.rsmod.routefinder.RouteFinding
import org.rsmod.routefinder.collision.CollisionFlagMap
import org.rsmod.routefinder.flag.CollisionFlag

object BotActionsCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val origin = CoordGrid(3223, 3215, 0)
        check(BotActions.near(origin, CoordGrid(3235, 3227, 0), 12))
        check(!BotActions.near(origin, CoordGrid(3236, 3215, 0), 12))
        check(!BotActions.near(origin, CoordGrid(3223, 3215, 1), 12))
        check(!BotActions.near(origin, origin, -1))
        check(BotActions.named("  Oak  ", setOf("oak", "Tree")))
        check(!BotActions.named("Willow", setOf("Tree")))
        check(!BotActions.named("Bank deposit box", setOf("Bank booth", "Bank chest")))
        check(BotActions.matchesOption("Small Net", "net"))
        check(BotActions.matchesOption("NET", "net"))
        check(!BotActions.matchesOption("Big Net", "net"))
        check(!BotActions.matchesOption(null, "net"))
        check(!BotActions.matchesOption("Bait", "net"))
        val zones = BotActions.zones(origin, 12).toSet()
        check(ZoneKey.from(CoordGrid(3211, 3203, 0)) in zones)
        check(ZoneKey.from(CoordGrid(3235, 3227, 0)) in zones)
        check(zones.all { it.level == origin.level })
        check(BotActions.zones(CoordGrid(0, 0, 0), 12).all { it.x >= 0 && it.z >= 0 })
        check(BotActions.zones(origin, 0).single() == ZoneKey.from(origin))
        for (angle in 0..3) checkSharedApproaches(angle)
        checkSharedFishingApproaches()
        println("Bot interaction checks passed: matching, shared trees and unlimited fishing approaches.")
    }

    private fun checkSharedFishingApproaches() {
        val collision = CollisionFlagMap()
        for (x in 0..40 step 8) for (z in 0..40 step 8) collision.allocateIfAbsent(x, z, 0)
        val routes = RouteFinding(collision)
        val source = CoordGrid(16, 20, 0)
        val target = CoordGrid(20, 20, 0)
        collision.add(20, 20, 0, CollisionFlag.BLOCK_WALK)
        val occupied = mutableSetOf<CoordGrid>()
        repeat(4) {
            val tile = checkNotNull(BotActions.npcGatheringDestination(routes, source, target, 1, occupied))
            check(occupied.add(tile)) { "Exclusive NPC approaches must select separate standing tiles" }
        }
        check(BotActions.npcGatheringDestination(routes, source, target, 1, occupied) == null)
        repeat(300) {
            val tile = checkNotNull(BotActions.npcGatheringDestination(
                routes, source, target, 1, occupied, shared = true))
            check(tile in occupied) { "Fishing bots must be able to share occupied approaches" }
        }
        val released = occupied.first()
        occupied.remove(released)
        check(BotActions.npcGatheringDestination(routes, source, target, 1, occupied) == released)
        for (z in 0..47) collision.add(18, z, 0, CollisionFlag.BLOCK_WALK)
        check(BotActions.npcGatheringDestination(routes, source, target, 1, emptySet()) == null)
        check(BotActions.npcGatheringDestination(
            routes, source, target, 1, occupied, shared = true) == null)
    }

    private fun checkSharedApproaches(angle: Int) {
        val collision = CollisionFlagMap()
        for (x in 0..40 step 8) for (z in 0..40 step 8) collision.allocateIfAbsent(x, z, 0)
        val routes = RouteFinding(collision)
        val type = ObjectServerType(id = 1, name = "Oak", width = 2, length = 3)
        val loc = LocInfo(2, CoordGrid(20, 20, 0), LocEntity(type.id, 10, angle))
        val width = if (angle % 2 == 0) type.width else type.length
        val length = if (angle % 2 == 0) type.length else type.width
        for (x in 20 until 20 + width) for (z in 20 until 20 + length) {
            collision.add(x, z, 0, CollisionFlag.LOC)
        }
        val source = CoordGrid(16, 20, 0)
        val occupied = mutableSetOf<CoordGrid>()
        // All legal standing tiles can be allocated independently around the same tree.
        repeat(2 * (width + length)) {
            val tile = checkNotNull(BotActions.gatheringDestination(routes, source, loc, type, occupied))
            check(occupied.add(tile)) { "Two woodcutters selected the same standing tile" }
            val adjacent = routes.findRoute(level = 0, srcX = tile.x, srcZ = tile.z,
                destX = loc.coords.x, destZ = loc.coords.z, destWidth = type.width,
                destLength = type.length, locShape = 10, locAngle = angle, moveNear = false)
            check(adjacent.success && adjacent.isEmpty())
        }
        check(BotActions.gatheringDestination(routes, source, loc, type, occupied) == null)
        val released = occupied.first()
        occupied.remove(released)
        check(BotActions.gatheringDestination(routes, source, loc, type, occupied) == released)
        check(BotActions.gatheringDestination(routes, released, loc, type, occupied) == released)
        // Free tiles across a solid barrier must never be selected as reachable approaches.
        for (z in 0..47) collision.add(18, z, 0, CollisionFlag.BLOCK_WALK)
        check(BotActions.gatheringDestination(routes, source, loc, type, emptySet()) == null)
    }
}
