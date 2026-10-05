package org.rsmod.content.skills.cooking

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.script.onOpHeld1
import org.rsmod.game.inv.isType
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class SwampToadEvents : PluginScript() {
    override fun ScriptContext.startup() {
        onOpHeld1("obj.swamp_toad") { removeLegs(it.slot) }
    }

    internal fun ProtectedAccess.removeLegs(slot: Int) {
        if (inv[slot]?.isType("obj.swamp_toad") != true) {
            return
        }
        val legs = checkNotNull(ServerCacheManager.getItem("obj.toads_legs".asRSCM(RSCMType.OBJ)))
        if (invReplaceSlot(inv, slot, 1, legs).success) {
            mes("You pull the legs off the toad.")
        }
    }
}
