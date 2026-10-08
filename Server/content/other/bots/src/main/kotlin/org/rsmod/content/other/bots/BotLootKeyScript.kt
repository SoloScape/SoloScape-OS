package org.rsmod.content.other.bots

import dev.openrune.definition.type.widget.IfEvent
import dev.openrune.types.aconverted.interf.IfButtonOp
import jakarta.inject.Inject
import org.rsmod.api.invtx.add as txAdd
import org.rsmod.api.invtx.delete as txDelete
import org.rsmod.api.invtx.invDel
import org.rsmod.api.invtx.invTransaction
import org.rsmod.api.invtx.select
import org.rsmod.api.market.MarketPrices
import org.rsmod.api.player.output.UpdateInventory
import org.rsmod.api.player.output.runClientScript
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.ui.ifOpenMainModal
import org.rsmod.api.player.ui.ifSetEvents
import org.rsmod.api.player.ui.ifSetText
import org.rsmod.api.player.vars.intVarBit
import org.rsmod.api.script.advanced.onDestroyHeld
import org.rsmod.api.script.onIfModalButton
import org.rsmod.api.script.onIfOpen
import org.rsmod.api.script.onOpHeld1
import org.rsmod.api.script.onOpHeld2
import org.rsmod.api.script.onOpHeld3
import org.rsmod.api.script.onOpHeld4
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpLocU
import org.rsmod.content.interfaces.bank.BankTab
import org.rsmod.content.interfaces.bank.bankCapacity
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory
import org.rsmod.game.type.getInvObj
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

private const val LOOT_INTERFACE = "interface.wildy_loot_chest"
private const val LOOT_COMPONENT = "component.wildy_loot_chest:"
private const val ITEMS_PER_TAB = 28

private var Player.selectedLootKeyTab by intVarBit("varbit.deadman_loot_tab")
private var Player.lootKeyWithdrawNotes by intVarBit("varbit.deadman_loot_withdrawnotes")

internal class BotLootKeyScript
@Inject
constructor(
    private val store: BotLootKeyStore,
    private val marketPrices: MarketPrices,
    private val eventBus: EventBus,
) : PluginScript() {
    override fun ScriptContext.startup() {
        for (key in BotLootKeys.types) {
            onOpHeld1(key) { checkKey(it.slot) }
            onOpHeld2(key) { checkKey(it.slot) }
            onOpHeld3(key) { checkKey(it.slot) }
            onOpHeld4(key) { checkKey(it.slot) }
        }
        onDestroyHeld {
            if (type in BotLootKeys.types) {
                store.remove(obj.vars)
            }
        }
        for (chest in BotLootKeys.chests) {
            onOpLoc1(chest) { openFirstKey() }
            for (key in BotLootKeys.types) {
                onOpLocU(chest, key) { openKey(it.invSlot) }
            }
        }

        onIfOpen(LOOT_INTERFACE) {
            player.setupLootKeyButtons()
            player.refreshLootKeyValues()
        }
        onIfModalButton("${LOOT_COMPONENT}tabs") {
            if (it.op == IfButtonOp.Op1 && it.comsub in 0 until BotLootKeys.MAX_KEYS) {
                player.selectedLootKeyTab = it.comsub
            }
        }
        onIfModalButton("${LOOT_COMPONENT}withdrawitem") { player.lootKeyWithdrawNotes = 0 }
        onIfModalButton("${LOOT_COMPONENT}withdrawnote") { player.lootKeyWithdrawNotes = 1 }
        onIfModalButton("${LOOT_COMPONENT}withdrawinv") {
            if (it.op == IfButtonOp.Op1) {
                withdrawAll(toBank = false)
            }
        }
        onIfModalButton("${LOOT_COMPONENT}withdrawbank") {
            if (it.op == IfButtonOp.Op1) {
                withdrawAll(toBank = true)
            }
        }
        onIfModalButton("${LOOT_COMPONENT}destroy_confirm") {
            if (it.op == IfButtonOp.Op1) {
                destroyTab(player.selectedLootKeyTab)
            }
        }
        onIfModalButton("${LOOT_COMPONENT}items") { itemOption(it.comsub, it.op) }
    }

    private fun Player.setupLootKeyButtons() {
        ifSetEvents(
            "${LOOT_COMPONENT}items",
            0 until BotLootKeys.MAX_KEYS * ITEMS_PER_TAB,
            IfEvent.Op1,
            IfEvent.Op2,
            IfEvent.Op3,
            IfEvent.Op4,
            IfEvent.Op5,
            IfEvent.Op6,
            IfEvent.Op7,
            IfEvent.Op8,
            IfEvent.Op9,
            IfEvent.Op10,
        )
        ifSetEvents("${LOOT_COMPONENT}tabs", 0 until BotLootKeys.MAX_KEYS, IfEvent.Op1)
        for (component in listOf(
            "withdrawitem",
            "withdrawnote",
            "withdrawinv",
            "withdrawbank",
            "destroy_confirm",
        )) {
            ifSetEvents("$LOOT_COMPONENT$component", 0..0, IfEvent.Op1)
        }
    }

    private fun Player.heldKeys(): List<Pair<Int, InvObj>> =
        inv.indices.mapNotNull { slot ->
            val obj = inv[slot]
            if (BotLootKeys.isKey(obj)) slot to checkNotNull(obj) else null
        }.take(BotLootKeys.MAX_KEYS)

    private fun Player.keyAtTab(tab: Int): Pair<Int, InvObj>? = heldKeys().getOrNull(tab)

    private fun Player.refreshLootKeyInventories() {
        val keys = heldKeys()
        if (selectedLootKeyTab !in keys.indices) {
            selectedLootKeyTab = 0
        }
        for (tab in 0 until BotLootKeys.MAX_KEYS) {
            val display = Inventory.create("inv.deadman_loot_inv$tab")
            val loot = keys.getOrNull(tab)?.second?.let { store.get(it.vars) }.orEmpty()
            for (slot in 0 until minOf(display.size, loot.size)) {
                display[slot] = loot[slot]
            }
            UpdateInventory.updateInvFull(this, display)
        }
    }

    private fun Player.refreshLootKeyValues() {
        val keys = heldKeys()
        for (tab in 0 until BotLootKeys.MAX_KEYS) {
            val value = keys.getOrNull(tab)?.second?.let { store.get(it.vars) }
                ?.sumOf(::marketValue) ?: 0L
            val formatted = when {
                value >= 1_000_000 -> "${value / 1_000_000}m"
                value >= 1_000 -> "${value / 1_000}k"
                else -> value.toString()
            }
            runClientScript(8013, tab, if (value > 0) formatted else "")
        }
        ifSetText("${LOOT_COMPONENT}occupiedslots", (invMap["inv.bank"]?.occupiedSpace() ?: 0).toString())
        ifSetText("${LOOT_COMPONENT}capacity", bankCapacity.toString())
    }

    private fun ProtectedAccess.checkKey(slot: Int) {
        val key = inv[slot] ?: return
        if (!BotLootKeys.isKey(key)) return
        val loot = store.get(key.vars)
        if (loot == null) {
            mes("This loot key no longer has any stored loot.")
            return
        }
        val value = loot.sumOf(::marketValue)
        val stacks = loot.size
        val items = loot.sumOf { it.count.toLong() }
        mes(
            "This loot key contains $stacks stacks ($items items) worth approximately " +
                "${"%,d".format(value)} coins."
        )
    }

    private fun ProtectedAccess.openFirstKey() {
        if (player.heldKeys().isEmpty()) {
            mes("You do not have a Wilderness loot key to open.")
            return
        }
        openChest(0)
    }

    private fun ProtectedAccess.openKey(slot: Int) {
        val tab = player.heldKeys().indexOfFirst { it.first == slot }
        if (tab < 0) return
        openChest(tab)
    }

    private fun ProtectedAccess.openChest(tab: Int) {
        player.selectedLootKeyTab = tab
        player.lootKeyWithdrawNotes = 0
        player.refreshLootKeyInventories()
        player.ifOpenMainModal(LOOT_INTERFACE, eventBus)
    }

    private suspend fun ProtectedAccess.itemOption(comsub: Int, op: IfButtonOp) {
        if (comsub !in 0 until BotLootKeys.MAX_KEYS * ITEMS_PER_TAB) return
        val tab = comsub / ITEMS_PER_TAB
        val slot = comsub % ITEMS_PER_TAB
        val key = player.keyAtTab(tab)?.second ?: return
        val item = store.get(key.vars)?.getOrNull(slot) ?: return

        when (op) {
            IfButtonOp.Op1 -> withdraw(tab, mapOf(slot to 1), toBank = false)
            IfButtonOp.Op2 -> withdraw(tab, mapOf(slot to 5), toBank = false)
            IfButtonOp.Op3 -> withdraw(tab, mapOf(slot to 10), toBank = false)
            IfButtonOp.Op4 -> {
                val count = countDialog()
                if (count > 0) withdraw(tab, mapOf(slot to count), toBank = false)
            }
            IfButtonOp.Op5 -> withdraw(tab, mapOf(slot to item.count), toBank = false)
            IfButtonOp.Op6 -> {
                val count = countDialog()
                if (count > 0) withdraw(tab, mapOf(slot to count), toBank = true)
            }
            IfButtonOp.Op7 -> withdraw(tab, mapOf(slot to item.count), toBank = true)
            IfButtonOp.Op8 -> {
                val count = countDialog()
                if (count > 0) destroyItems(tab, mapOf(slot to count))
            }
            IfButtonOp.Op9 -> destroyItems(tab, mapOf(slot to item.count))
            IfButtonOp.Op10 -> {
                val display = Inventory.create("inv.deadman_loot_inv$tab")
                display[slot] = item
                objExamine(display, slot)
            }
            else -> Unit
        }
    }

    private fun ProtectedAccess.withdrawAll(toBank: Boolean) {
        val tab = player.selectedLootKeyTab
        val key = player.keyAtTab(tab)?.second ?: return
        val loot = store.get(key.vars) ?: return
        withdraw(tab, loot.indices.associateWith { loot[it].count }, toBank)
    }

    private fun ProtectedAccess.withdraw(
        tab: Int,
        requested: Map<Int, Int>,
        toBank: Boolean,
    ) {
        val (keySlot, key) = player.keyAtTab(tab) ?: return
        val loot = store.get(key.vars) ?: return
        val amounts = requested.mapNotNull { (slot, count) ->
            val item = loot.getOrNull(slot) ?: return@mapNotNull null
            val amount = count.coerceIn(0, item.count)
            if (amount > 0) slot to amount else null
        }.toMap()
        if (amounts.isEmpty()) return

        val asNote = !toBank && player.lootKeyWithdrawNotes != 0
        if (asNote && amounts.keys.any { slot ->
                val type = getInvObj(loot[slot])
                !type.canCert && !type.isCert
            }) {
            mes("One or more of these items cannot be withdrawn as notes.")
            return
        }

        val remaining = loot.mapIndexedNotNull { slot, item ->
            val left = item.count - (amounts[slot] ?: 0)
            if (left > 0) InvObj(item.id, left, item.vars) else null
        }

        if (toBank) {
            val newTypes = amounts.keys.map { loot[it].id }.distinct()
                .count { id -> bank.none { it?.id == id } }
            if (bank.occupiedSpace() + newTypes > bankCapacity) {
                mes("You do not have enough bank space to store this loot.")
                return
            }
        }

        val bankBefore = if (toBank) bank.occupiedSpace() else 0
        val transaction = player.invTransaction(inv, if (toBank) bank else null, autoCommit = false) {
            val carried = select(inv)
            val target = if (toBank) select(bank) else carried
            if (remaining.isEmpty()) {
                txDelete(
                    inv = carried,
                    obj = key.id,
                    count = 1,
                    slot = keySlot,
                    strict = true,
                    placehold = false,
                )
            }
            for ((slot, amount) in amounts) {
                val item = loot[slot]
                txAdd(
                    inv = target,
                    obj = item.id,
                    count = amount,
                    vars = item.vars,
                    slot = null,
                    strict = true,
                    cert = asNote && !getInvObj(item).isCert,
                    uncert = toBank,
                )
            }
        }
        if (transaction.failure) {
            mes(if (toBank) "You do not have enough bank space to store this loot."
                else "You need more inventory space to retrieve this loot.")
            return
        }

        transaction.commitAll()
        if (toBank) {
            val addedSlots = bank.occupiedSpace() - bankBefore
            if (addedSlots > 0) {
                BankTab.Main.increaseSize(this, addedSlots)
            }
        }
        store.replace(key.vars, remaining)
        player.refreshLootKeyInventories()
        player.refreshLootKeyValues()
    }

    private fun ProtectedAccess.destroyItems(tab: Int, requested: Map<Int, Int>) {
        val (keySlot, key) = player.keyAtTab(tab) ?: return
        val loot = store.get(key.vars) ?: return
        val remaining = loot.mapIndexedNotNull { slot, item ->
            val deleted = (requested[slot] ?: 0).coerceIn(0, item.count)
            if (deleted < item.count) InvObj(item.id, item.count - deleted, item.vars) else null
        }
        if (remaining.size == loot.size && remaining.zip(loot).all { it.first.count == it.second.count }) {
            return
        }
        if (remaining.isEmpty()) {
            if (!player.invDel(inv, key.id, 1, slot = keySlot).success) return
        }
        store.replace(key.vars, remaining)
        player.refreshLootKeyInventories()
        player.refreshLootKeyValues()
    }

    private fun ProtectedAccess.destroyTab(tab: Int) {
        val key = player.keyAtTab(tab)?.second ?: return
        val loot = store.get(key.vars) ?: return
        destroyItems(tab, loot.indices.associateWith { loot[it].count })
    }

    private fun marketValue(item: InvObj): Long {
        val type = getInvObj(item)
        val each = (marketPrices[type] ?: type.cost).toLong().coerceAtLeast(1L)
        return each * item.count.toLong()
    }
}
