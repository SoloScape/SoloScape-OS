package org.rsmod.content.skills.construction

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import org.rsmod.api.player.output.VarpSync
import org.rsmod.api.player.vars.boolVarBit
import org.rsmod.api.player.vars.intVarBit
import org.rsmod.game.entity.Player

var Player.houseTeleportOutside by boolVarBit("varbit.poh_tele_toggle")
var Player.houseTeleportBuildMode by boolVarBit("varbit.poh_teleport_building_mode")
var Player.houseDoors by intVarBit("varbit.poh_doors_option")

fun Player.syncHouseOptions() {
    for (name in listOf(VARBIT_BUILD_MODE, "varbit.poh_tele_toggle", "varbit.poh_teleport_building_mode")) {
        val bit = checkNotNull(ServerCacheManager.getVarbit(name.asRSCM()))
        val varp = checkNotNull(ServerCacheManager.getVarp(bit.varp))
        VarpSync.writeVarp(this, varp, vars[varp])
    }
}
