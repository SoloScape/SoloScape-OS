package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import org.rsmod.content.interfaces.bank.scripts.BankInvScript
import org.rsmod.game.inv.Inventory
import org.rsmod.game.inv.InvObj
import org.rsmod.api.script.onIfModalButton
import org.rsmod.api.script.onPlayerLogin
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.script.onOpHeld1
import org.rsmod.api.script.onOpHeld3
import org.rsmod.api.script.onOpHeld4
import org.rsmod.api.script.onOpWorn2
import org.rsmod.api.script.onOpWorn3
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

/**
 * 2026 OSRS: Fill, Wear, Check, Open/Close, Destroy for the regular basket.
 * 'Check' separately offers an inventory Empty action. Held option 2 (Wear)
 * and option 5 (Destroy) are left to the standard item handlers.
 * The Forestry basket has a distinct View / Configure menu.
 */
class ForestryLogBasketScript @Inject constructor(
    private val bankInv: BankInvScript,
) : PluginScript() {
    override fun ScriptContext.startup() {
        onPlayerLogin { ForestryLogBasket.restoreLegacyOpenState(player) }
        // This cache's bank CS2 already draws a Deposit Containers control.
        // Bind only when the gameval component actually exists (older caches
        // must never fail plugin startup over a missing UI mapping).
        if (runCatching {
            "component.bankmain:depositcontainers".asRSCM(RSCMType.COMPONENT)
        }.isSuccess) {
            onIfModalButton("component.bankmain:depositcontainers") {
                depositBasketToBank()
            }
        }
        val baskets = ServerCacheManager.getItems().values.filter {
            it.internalName in setOf(
                ForestryLogBasket.LOG_CLOSED,
                ForestryLogBasket.LOG_OPEN,
                ForestryLogBasket.FORESTRY_CLOSED,
                ForestryLogBasket.FORESTRY_OPEN,
            )
        }
        for (item in baskets) {
            val symbol = item.internalName
            val combined = symbol.startsWith("obj.forestry_basket_")
            onOpHeld1(symbol) { fillBasket() }
            onOpHeld3(symbol) {
                if (combined) viewBasket() else checkBasket()
            }
            onOpHeld4(symbol) {
                if (combined) configureBasket() else toggleBasket()
            }
            if (combined) {
                onOpWorn2(symbol) { viewBasket() }
                onOpWorn3(symbol) { configureBasket() }
            }
        }
    }

    private fun ProtectedAccess.depositBasketToBank() {
        if (!ForestryLogBasket.hasBasket(player)) return
        val moved = ForestryLogBasket.depositToBank(player) { symbol ->
            // Use the normal bank deposit flow so existing stacks, selected tabs,
            // tab sizes, placeholders and bank capacity are updated normally.
            // Temporary source is discarded only after a successful transaction.
            val staging = Inventory.create("inv.inv")
            staging[0] = InvObj(symbol)
            with(bankInv) {
                this@depositBasketToBank.invDeposit(0, 1, staging)
            }
        }
        if (moved > 0) mes("You deposit $moved logs from your basket.")
        else if (ForestryLogBasket.count(player) > 0)
            mes("You don't have enough space in your bank for these logs.")
    }

    private fun ProtectedAccess.fillBasket() {
        if (!ForestryLogBasket.hasBasket(player)) return
        val count = ForestryLogBasket.fill(player)
        mes(if (count > 0) "You put $count logs in your basket."
            else "There are no logs to store, or your basket is full.")
    }

    private suspend fun ProtectedAccess.checkBasket() {
        if (!ForestryLogBasket.hasBasket(player)) return
        val logs = ForestryLogBasket.stored(player)
        mes("Your log basket holds ${logs.size} of 28 logs.")
        for ((symbol, count) in logs.groupingBy { it }.eachCount()) {
            val name = ServerCacheManager.getItems().values
                .firstOrNull { it.internalName == symbol }?.name ?: "Logs"
            mes("$name: $count")
        }
        if (logs.isEmpty()) return
        val option = menu("Would you like to empty your log basket?",
            choices = listOf("Empty logs", "Keep logs"))
        if (option != 0) return
        val moved = ForestryLogBasket.empty(player)
        mes(if (moved > 0) "You take $moved logs out of your basket."
            else "You need more inventory space to empty the basket.")
    }

    private suspend fun ProtectedAccess.viewBasket() {
        if (!ForestryLogBasket.hasBasket(player)) return
        when (menu("View Forestry basket",
            choices = listOf("Check log basket", "Cancel"))) {
            0 -> checkBasket()
        }
    }

    private suspend fun ProtectedAccess.configureBasket() {
        if (!ForestryLogBasket.hasBasket(player)) return
        val option = menu("Configure Forestry basket", choices = listOf(
            if (ForestryLogBasket.isOpen(player)) "Close log basket" else "Open log basket",
            "Check log basket",
            "Cancel",
        ))
        when (option) {
            0 -> toggleBasket()
            1 -> checkBasket()
        }
    }

    private fun ProtectedAccess.toggleBasket() {
        if (!ForestryLogBasket.hasBasket(player)) return
        val open = ForestryLogBasket.toggleOpen(player)
        mes(if (open) "Your log basket is open and will collect cut logs."
            else "You close your log basket.")
    }
}
