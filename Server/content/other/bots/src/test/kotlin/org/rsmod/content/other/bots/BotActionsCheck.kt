package org.rsmod.content.other.bots

import org.rsmod.map.CoordGrid
import org.rsmod.map.zone.ZoneKey

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
        val zones = BotActions.zones(origin, 12).toSet()
        check(ZoneKey.from(CoordGrid(3211, 3203, 0)) in zones)
        check(ZoneKey.from(CoordGrid(3235, 3227, 0)) in zones)
        check(zones.all { it.level == origin.level })
        check(BotActions.zones(CoordGrid(0, 0, 0), 12).all { it.x >= 0 && it.z >= 0 })
        check(BotActions.zones(origin, 0).single() == ZoneKey.from(origin))
        println("Bot interaction proximity and matching checks passed.")
    }
}
