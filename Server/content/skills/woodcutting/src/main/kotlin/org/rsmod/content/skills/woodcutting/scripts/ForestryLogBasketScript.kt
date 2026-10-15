package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.script.onOpHeld1
import org.rsmod.api.script.onOpHeld2
import org.rsmod.api.script.onOpHeld3
import org.rsmod.api.script.onOpHeld4
import org.rsmod.api.script.onOpHeld5
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

/** Cache-backed item actions: do not replace Wear or Destroy with basket controls. */
class ForestryLogBasketScript : PluginScript() {
    override fun ScriptContext.startup() {
        val baskets = ServerCacheManager.getItems().values.filter {
            it.name.equals("Log basket", ignoreCase = true) ||
                it.name.equals("Forestry basket", ignoreCase = true)
        }
        for (item in baskets) {
            val symbol = item.internalName
            for (index in 0..4) {
                val label = item.actions.getOpOrNull(index)?.lowercase() ?: continue
                if (label !in setOf("fill", "empty", "check", "open", "close")) continue
                when (index) {
                    0 -> onOpHeld1(symbol) { basketAction(label) }
                    1 -> onOpHeld2(symbol) { basketAction(label) }
                    2 -> onOpHeld3(symbol) { basketAction(label) }
                    3 -> onOpHeld4(symbol) { basketAction(label) }
                    4 -> onOpHeld5(symbol) { basketAction(label) }
                }
            }
        }
    }

    private fun ProtectedAccess.basketAction(option: String) {
        if (!ForestryLogBasket.hasBasket(player)) return
        when (option) {
            "fill" -> {
                val count = ForestryLogBasket.fill(player)
                mes(if (count > 0) "You put $count logs in your basket."
                    else "There are no logs to store, or your basket is full.")
            }
            "empty" -> {
                val count = ForestryLogBasket.empty(player)
                mes(if (count > 0) "You take $count logs out of your basket."
                    else "Your basket is empty, or you need more inventory space.")
            }
            "check" -> mes("Your log basket holds ${ForestryLogBasket.count(player)} of 28 logs.")
            "open", "close" -> {
                val open = ForestryLogBasket.toggleOpen(player)
                mes(if (open) "Your log basket is open and will collect cut logs."
                    else "You close your log basket.")
            }
        }
    }
}
