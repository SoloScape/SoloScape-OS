package org.rsmod.content.skills.agility

import jakarta.inject.Inject
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.stat.baseAgilityLvl
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.stats.xpmod.XpModifiers
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

internal object AgilityPyramidRewards {
    const val PYRAMID_TOP_VALUE = 10_000

    fun completionXp(baseAgility: Int): Double =
        minOf(MAX_COMPLETION_XP, BASE_COMPLETION_XP + (baseAgility * XP_PER_AGILITY_LEVEL))

    fun coinsForTops(count: Int): Int {
        require(count >= 0) { "Pyramid top count must not be negative." }
        return count * PYRAMID_TOP_VALUE
    }

    private const val BASE_COMPLETION_XP = 300.0
    private const val XP_PER_AGILITY_LEVEL = 8.0
    private const val MAX_COMPLETION_XP = 1000.0
}

class AgilityPyramidSummit
@Inject
constructor(private val xpMods: XpModifiers) : PluginScript() {
    override fun ScriptContext.startup() {
        onOpLoc1(TOP_ROCKS) { claimPyramidTop(it.loc) }
        onOpLoc1(DOORWAY) { leavePyramid(it.loc) }
        onOpLoc1(DOORWAY_MIRROR) { leavePyramid(it.loc) }
    }

    private suspend fun ProtectedAccess.claimPyramidTop(loc: BoundLocInfo) {
        if (player.baseAgilityLvl < REQUIRED_LEVEL) {
            mes("You need an Agility level of $REQUIRED_LEVEL to climb the pyramid.")
            return
        }

        faceSquare(loc.coords)
        anim(TOP_CLIMB_SEQ)
        delay(TOP_CLIMB_TICKS)
        resetAnim()

        if (vars[TOP_VARBIT] != 0) {
            mes("You find nothing on top of the pyramid.")
            return
        }
        if (!inv.hasFreeSpace()) {
            mes("You don't have enough inventory space to pick up the pyramid top.")
            return
        }

        val result = invAdd(inv, PYRAMID_TOP)
        if (!result.success) {
            mes("You don't have enough inventory space to pick up the pyramid top.")
            return
        }

        vars[TOP_VARBIT] = 1
        objbox(PYRAMID_TOP, "You find a golden pyramid!")
    }

    private suspend fun ProtectedAccess.leavePyramid(loc: BoundLocInfo) {
        if (player.baseAgilityLvl < REQUIRED_LEVEL) {
            mes("You need an Agility level of $REQUIRED_LEVEL to use the Agility Pyramid.")
            return
        }

        faceSquare(loc.coords)
        vars[TOP_VARBIT] = 0

        val completionXp = AgilityPyramidRewards.completionXp(player.baseAgilityLvl)
        statAdvance(STAT_AGILITY, completionXp * xpMods.get(player, STAT_AGILITY))

        telejump(BASE_EXIT, TeleportType.Exempt)
        mesbox("You climb down the steep passage. It leads to the base of the pyramid.")
    }

    private companion object {
        const val REQUIRED_LEVEL = 30
        const val TOP_CLIMB_TICKS = 3
        const val STAT_AGILITY = "stat.agility"

        const val TOP_ROCKS = "loc.agility_pyramid_wall_rocks"
        const val DOORWAY = "loc.agility_pyramid_door_hotspot"
        const val DOORWAY_MIRROR = "loc.agility_pyramid_door_hotspot_mirror"
        const val PYRAMID_TOP = "obj.agility_pyramid_gold_pyramid"
        const val TOP_VARBIT = "varbit.agility_pyramid_top"
        const val TOP_CLIMB_SEQ = "seq.agility_pyramid_top_climb"

        val BASE_EXIT = CoordGrid(3364, 2830, 0)
    }
}
