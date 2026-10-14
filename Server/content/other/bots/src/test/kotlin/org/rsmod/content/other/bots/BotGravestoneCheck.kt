package org.rsmod.content.other.bots

import org.rsmod.api.death.PlayerDeathContext
import org.rsmod.api.death.PlayerGravestones
import org.rsmod.api.death.plugin.StandardPvmDeathHook
import org.rsmod.game.entity.Player
import org.rsmod.map.CoordGrid

/** Regression: ordinary PvM creates graves; PvP/instances retain existing death handlers. */
object BotGravestoneCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val coords = CoordGrid(3211, 3423, 0)
        val ctx = PlayerDeathContext(
            player = Player(), coords = coords,
            inWilderness = false, wildernessLevel = -1,
            inRevenantCaves = false, inInstance = false,
            isSkulled = false, hasProtectItem = false,
            recentPvpDamage = false, gamemode = 0, killer = null,
        )
        val hook = StandardPvmDeathHook()
        val pvm = checkNotNull(hook.handleDeath(ctx))
        check(pvm.useGravestone)
        check(pvm.keepCount == 3)
        check(!pvm.dropAllCarried && !pvm.destroyLostCarried)
        check(!checkNotNull(hook.handleDeath(ctx.copy(inInstance = true))).useGravestone)
        check(!checkNotNull(hook.handleDeath(ctx.copy(recentPvpDamage = true))).useGravestone)
        check(hook.handleDeath(ctx.copy(inWilderness = true)) == null)
        check(PlayerGravestones.GRAVE_TICKS == 1500)

        val grave = PlayerGravestones.Grave("worldbot_12", coords,
            mutableListOf())
        check(grave.items.isEmpty() && grave.remaining == 1500 && !grave.office)
        check(BotFleePlanner.shouldInterrupt(BotMode.Skilling, BotTaskKind.Woodcutting))
        check(BotFleePlanner.shouldInterrupt(BotMode.Progressive, BotTaskKind.Mining))
        check(!BotFleePlanner.shouldInterrupt(BotMode.Combat, BotTaskKind.Combat))
        println("BotGravestoneCheck OK")
    }
}
