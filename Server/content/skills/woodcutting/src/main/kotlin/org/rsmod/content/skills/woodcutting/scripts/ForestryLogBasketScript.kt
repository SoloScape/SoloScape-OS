package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.script.onOpHeld1
import org.rsmod.api.script.onOpHeld3
import org.rsmod.api.script.onOpHeld4
import org.rsmod.api.script.onOpWorn2
import org.rsmod.api.script.onOpWorn3
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

/**
 * Native log basket: held option 1 Fill, option 3 Check, option 4 Open/Empty.
 * Never handle held option 2 (Wear) or 5 (Destroy).
 */
class ForestryLogBasketScript : PluginScript() {
    override fun ScriptContext.startup() {
        val baskets = ServerCacheManager.getItems().values.filter {
            it.name.equals("Log basket", ignoreCase = true) ||
                it.name.equals("Forestry basket", ignoreCase = true)
        }
        for (item in baskets) {
            val symbol = item.internalName
            onOpHeld1(symbol) { fillBasket() }
            onOpHeld3(symbol) { checkBasket() }
            onOpHeld4(symbol) { openOrEmptyBasket() }
            if (item.name.equals("Forestry basket", ignoreCase = true)) {
                // The combined basket remains wearable; these are utility ops.
                onOpWorn2(symbol) { checkBasket() }
                onOpWorn3(symbol) { fillBasket() }
            }
        }
    }

    private fun ProtectedAccess.fillBasket() {
        if (!ForestryLogBasket.hasBasket(player)) return
        val count = ForestryLogBasket.fill(player)
        mes(if (count > 0) "You put $count logs in your basket."
            else "There are no logs to store, or your basket is full.")
    }

    private fun ProtectedAccess.checkBasket() {
        if (ForestryLogBasket.hasBasket(player))
            mes("Your log basket holds ${ForestryLogBasket.count(player)} of 28 logs.")
    }

    private fun ProtectedAccess.openOrEmptyBasket() {
        if (!ForestryLogBasket.hasBasket(player)) return
        if (ForestryLogBasket.isOpen(player) && ForestryLogBasket.count(player) > 0) {
            val count = ForestryLogBasket.empty(player)
            mes(if (count > 0) "You take $count logs out of your basket."
                else "You need more inventory space to empty the basket.")
        } else {
            val open = ForestryLogBasket.toggleOpen(player)
            mes(if (open) "Your log basket is open and will collect cut logs."
                else "You close your log basket.")
        }
    }
}
