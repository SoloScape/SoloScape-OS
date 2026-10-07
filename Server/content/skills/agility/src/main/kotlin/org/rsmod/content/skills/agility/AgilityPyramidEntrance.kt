package org.rsmod.content.skills.agility

import org.rsmod.api.player.hook.TeleportType
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.script.onOpLoc1
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class AgilityPyramidEntrance : PluginScript() {
    override fun ScriptContext.startup() {
        for (loc in ROCKS) {
            onOpLoc1(loc) { cross(it.loc) }
        }
    }

    private suspend fun ProtectedAccess.cross(loc: BoundLocInfo) {
        val dest = destination(loc.coords) ?: return
        faceSquare(loc.coords)
        anim(CLIMB)
        delay(CROSS_TICKS)
        teleport(dest, TeleportType.Exempt)
        resetAnim()
    }

    private companion object {
        const val CLIMB = "seq.human_climbing_down"
        const val CROSS_TICKS = 3

        val ROCKS =
            listOf(
                "loc.ntk_agility_climbing_rocks_1",
                "loc.ntk_agility_climbing_rocks_2",
            )

        fun destination(loc: CoordGrid): CoordGrid? {
            if (loc.level != 0) {
                return null
            }
            val destX =
                when (loc.x) {
                    3335 -> 3338
                    3337 -> 3334
                    3349 -> 3352
                    3351 -> 3348
                    else -> return null
                }
            val validZ =
                when (loc.x) {
                    3335, 3337 -> 2826..2829
                    3349, 3351 -> 2827..2829
                    else -> return null
                }
            if (loc.z !in validZ) {
                return null
            }
            return CoordGrid(destX, loc.z, loc.level)
        }
    }
}
