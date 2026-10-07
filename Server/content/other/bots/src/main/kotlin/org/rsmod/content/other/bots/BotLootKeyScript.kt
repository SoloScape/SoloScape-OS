package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.definition.type.widget.IfEvent
import dev.openrune.types.aconverted.interf.IfButtonOp
import jakarta.inject.Inject
import java.util.WeakHashMap
import org.rsmod.api.invtx.add as txAdd
import org.rsmod.api.invtx.delete as txDelete
import org.rsmod.api.invtx.invTransaction
import org.rsmod.api.invtx.select
import org.rsmod.api.market.MarketPrices
import org.rsmod.api.player.output.UpdateInventory
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.api.script.advanced.onDestroyHeld
import org.rsmod.api.script.onIfClose
import org.rsmod.api.script.onIfModalButton
import org.rsmod.api.script.onOpHeld1
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpLocU
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory
import org.rsmod.game.type.getInvObj
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

/**
 * Bot loot keys use the native Wilderness Loot Chest interface instead of instantly dumping their
 * contents into the player's inventory. The stored bundle remains authoritative while the five
 * Deadman/PvP loot inventories are presentation-only client copies.
 */
internal class BotLootKeyScript
@Inject
constructor(
    private val store: BotLootKeyStore,
    private val marketPrices: MarketPrices,
) : PluginScript() {
    private data class LootSession(
        val bundleId: Int,
        var withdrawNotes: Boolean = false,
    )

    private val sessions = WeakHashMap<Player, LootSession>()

    override fun ScriptContext.startup() {
        for (key in BotLootKeys.types) {
            onOpHeld1(key) { checkKey(it.slot) }
        }
        onDestroyHeld {
            if (type in BotLootKeys.types) {
                sessions.remove(player)
                store.remove(obj.vars)
            }
        }

        for (chest in BotLootKeys.chests) {
            onOpLoc1(chest) { openFirstKey() }
            for (key in BotLootKeys.types) {
                onOpLocU(chest, key) { openKey(it.invSlot) }
            }
        }

        onIfModalButton(ITEMS_COMPONENT) { event ->
            when (event.op) {
                IfButtonOp.Op1 -> withdrawItem(event.comsub, 1)
                IfButtonOp.Op2 -> withdrawItem(event.comsub, 5)
                IfButtonOp.Op3 -> withdrawItem(event.comsub, 10)
                IfButtonOp.Op4 -> withdrawItem(event.comsub, Int.MAX_VALUE)
                IfButtonOp.Op5 -> withdrawItem(event.comsub, countDialog())
                IfButtonOp.Op10 -> examineLoot(event.comsub)
                else -> Unit
            }
        }
        onIfModalButton(WITHDRAW_ITEM_COMPONENT) { setWithdrawNotes(false) }
        onIfModalButton(WITHDRAW_NOTE_COMPONENT) { setWithdrawNotes(true) }
        onIfModalButton(WITHDRAW_INV_COMPONENT) { withdrawAll(toBank = false) }
        onIfModalButton(WITHDRAW_BANK_COMPONENT) { withdrawAll(toBank = true) }
        onIfModalButton(DESTROY_COMPONENT) { showDestroyConfirmation() }
        onIfModalButton(DESTROY_CONFIRM_COMPONENT) { destroyCurrentKey() }
        onIfModalButton(DESTROY_CANCEL_COMPONENT) { hideDestroyConfirmation() }
        onIfClose(LOOT_INTERFACE) {
            sessions.remove(player)
            clearClientLootInventories(player)
        }
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

    private suspend fun ProtectedAccess.openFirstKey() {
        val slots = inv.indices.filter { BotLootKeys.isKey(inv[it]) }
        if (slots.isEmpty()) {
            mes("You do not have a loot key to open.")
            return
        }
        if (slots.size == 1) {
            openKey(slots.first())
            return
        }

        val labels = slots.mapIndexed { index, slot -> keyChoiceLabel(index, slot) }
        val selected = when (slots.size.coerceAtMost(BotLootKeys.MAX_KEYS)) {
            2 -> choice2(labels[0], slots[0], labels[1], slots[1], title = "Which loot key?")
            3 -> choice3(
                labels[0], slots[0],
                labels[1], slots[1],
                labels[2], slots[2],
                title = "Which loot key?",
            )
            4 -> choice4(
                labels[0], slots[0],
                labels[1], slots[1],
                labels[2], slots[2],
                labels[3], slots[3],
                title = "Which loot key?",
            )
            else -> choice5(
                labels[0], slots[0],
                labels[1], slots[1],
                labels[2], slots[2],
                labels[3], slots[3],
                labels[4], slots[4],
                title = "Which loot key?",
            )
        }
        openKey(selected)
    }

    private fun ProtectedAccess.keyChoiceLabel(index: Int, slot: Int): String {
        val key = inv[slot] ?: return "Loot key ${index + 1}"
        val value = store.get(key.vars)?.sumOf(::marketValue) ?: 0L
        return "Loot key ${index + 1} (${"%,d".format(value)} gp)"
    }

    private fun ProtectedAccess.openKey(slot: Int) {
        val key = inv[slot] ?: return
        if (!BotLootKeys.isKey(key)) return
        val loot = store.get(key.vars)
        if (loot == null) {
            mes("This loot key no longer has any stored loot.")
            return
        }

        sessions[player] = LootSession(key.vars)
        VarPlayerIntMapSetter.set(player, "varbit.deadman_loot_tab", 0)
        VarPlayerIntMapSetter.set(player, "varbit.deadman_loot_withdrawnotes", 0)
        VarPlayerIntMapSetter.set(player, "varbit.wildy_loot_chest_has_loot", 1)

        publishLootInventories(player, loot)
        ifOpenMainModal(LOOT_INTERFACE)
        ifSetEvents(
            ITEMS_COMPONENT,
            0 until DEADMAN_LOOT_CAPACITY,
            IfEvent.Op1,
            IfEvent.Op2,
            IfEvent.Op3,
            IfEvent.Op4,
            IfEvent.Op5,
            IfEvent.Op10,
        )
        ifSetHide(CONFIRM_LAYER_COMPONENT, true)
        ifSetHide(CONTROLS_GREYOUT_LAYER_COMPONENT, true)
        refreshEmptyState(loot.isEmpty())
    }

    private suspend fun ProtectedAccess.withdrawItem(slot: Int, requested: Int) {
        if (requested <= 0) return
        val session = sessions[player] ?: return
        val loot = store.get(session.bundleId) ?: return closeMissingBundle()
        val item = loot.getOrNull(slot) ?: return
        val amount = minOf(requested, item.count)
        val keySlot = findKeySlot(session.bundleId) ?: return closeMissingBundle()
        val key = inv[keySlot] ?: return closeMissingBundle()

        val remaining = loot.toMutableList()
        if (amount >= item.count) {
            remaining.removeAt(slot)
        } else {
            remaining[slot] = InvObj(getInvObj(item), item.count - amount, item.vars)
        }

        val transaction = player.invTransaction(inv, autoCommit = false) {
            val target = select(inv)
            if (remaining.isEmpty()) {
                txDelete(
                    inv = target,
                    obj = key.id,
                    count = 1,
                    slot = keySlot,
                    strict = true,
                    placehold = false,
                )
            }
            val canNote = session.withdrawNotes && getInvObj(item).certlink != 0
            txAdd(
                inv = target,
                obj = item.id,
                count = amount,
                vars = item.vars,
                slot = null,
                strict = true,
                cert = canNote,
                uncert = false,
            )
        }
        if (transaction.failure) {
            mes("You do not have enough inventory space to withdraw that loot.")
            return
        }

        transaction.commitAll()
        store.replace(session.bundleId, remaining)
        if (remaining.isEmpty()) {
            sessions.remove(player)
            VarPlayerIntMapSetter.set(player, "varbit.wildy_loot_chest_has_loot", 0)
            clearClientLootInventories(player)
            ifClose()
            mes("You empty the loot key.")
        } else {
            refreshLoot(session.bundleId)
        }
    }

    private fun ProtectedAccess.withdrawAll(toBank: Boolean) {
        val session = sessions[player] ?: return
        val loot = store.get(session.bundleId) ?: return closeMissingBundle()
        val keySlot = findKeySlot(session.bundleId) ?: return closeMissingBundle()
        val key = inv[keySlot] ?: return closeMissingBundle()
        val destination = if (toBank) bank else inv

        val transaction = player.invTransaction(
            from = inv,
            into = if (destination === inv) null else destination,
            autoCommit = false,
        ) {
            val keyInv = select(inv)
            val target = if (destination === inv) keyInv else select(destination)
            txDelete(
                inv = keyInv,
                obj = key.id,
                count = 1,
                slot = keySlot,
                strict = true,
                placehold = false,
            )
            for (item in loot) {
                val canNote = !toBank && session.withdrawNotes && getInvObj(item).certlink != 0
                txAdd(
                    inv = target,
                    obj = item.id,
                    count = item.count,
                    vars = item.vars,
                    slot = null,
                    strict = true,
                    cert = canNote,
                    uncert = false,
                )
            }
        }
        if (transaction.failure) {
            mes(
                if (toBank) {
                    "You do not have enough bank space to withdraw all of this loot."
                } else {
                    "You do not have enough inventory space to withdraw all of this loot."
                }
            )
            return
        }

        transaction.commitAll()
        store.remove(session.bundleId)
        sessions.remove(player)
        VarPlayerIntMapSetter.set(player, "varbit.wildy_loot_chest_has_loot", 0)
        clearClientLootInventories(player)
        ifClose()
        mes(if (toBank) "You send the loot to your bank." else "You retrieve the loot.")
    }

    private fun ProtectedAccess.setWithdrawNotes(notes: Boolean) {
        val session = sessions[player] ?: return
        session.withdrawNotes = notes
        VarPlayerIntMapSetter.set(
            player,
            "varbit.deadman_loot_withdrawnotes",
            if (notes) 1 else 0,
        )
    }

    private fun ProtectedAccess.examineLoot(slot: Int) {
        val session = sessions[player] ?: return
        val item = store.get(session.bundleId)?.getOrNull(slot) ?: return
        val type = getInvObj(item)
        val value = marketValue(item)
        mes("${type.name} x${item.count} — approximately ${"%,d".format(value)} coins.")
    }

    private fun ProtectedAccess.showDestroyConfirmation() {
        val session = sessions[player] ?: return
        val loot = store.get(session.bundleId) ?: return closeMissingBundle()
        ifSetText(CONFIRM_TITLE_COMPONENT, "Destroy loot?")
        ifSetText(
            CONFIRM_BODY_COMPONENT,
            "Are you sure you want to destroy loot worth approximately " +
                "${"%,d".format(loot.sumOf(::marketValue))} coins?",
        )
        ifSetHide(CONTROLS_GREYOUT_LAYER_COMPONENT, false)
        ifSetHide(CONFIRM_LAYER_COMPONENT, false)
    }

    private fun ProtectedAccess.hideDestroyConfirmation() {
        ifSetHide(CONFIRM_LAYER_COMPONENT, true)
        ifSetHide(CONTROLS_GREYOUT_LAYER_COMPONENT, true)
    }

    private fun ProtectedAccess.destroyCurrentKey() {
        val session = sessions[player] ?: return
        val keySlot = findKeySlot(session.bundleId) ?: return closeMissingBundle()
        val key = inv[keySlot] ?: return closeMissingBundle()
        val result = player.invTransaction(inv, autoCommit = false) {
            val target = select(inv)
            txDelete(
                inv = target,
                obj = key.id,
                count = 1,
                slot = keySlot,
                strict = true,
                placehold = false,
            )
        }
        if (result.failure) return
        result.commitAll()
        store.remove(session.bundleId)
        sessions.remove(player)
        VarPlayerIntMapSetter.set(player, "varbit.wildy_loot_chest_has_loot", 0)
        clearClientLootInventories(player)
        ifClose()
        mes("You destroy the loot stored in the key.")
    }

    private fun ProtectedAccess.refreshLoot(bundleId: Int) {
        val loot = store.get(bundleId) ?: return closeMissingBundle()
        publishLootInventories(player, loot)
        refreshEmptyState(loot.isEmpty())
    }

    private fun ProtectedAccess.refreshEmptyState(empty: Boolean) {
        ifSetHide(ITEMS_COMPONENT, empty)
        ifSetHide(ITEMS_EMPTY_COMPONENT, !empty)
    }

    private fun ProtectedAccess.findKeySlot(bundleId: Int): Int? =
        inv.indices.firstOrNull { slot ->
            val key = inv[slot]
            BotLootKeys.isKey(key) && key?.vars == bundleId
        }

    private fun ProtectedAccess.closeMissingBundle() {
        sessions.remove(player)
        clearClientLootInventories(player)
        ifClose()
        mes("This loot key no longer has any stored loot.")
    }

    private fun publishLootInventories(player: Player, loot: List<InvObj>) {
        for ((index, invId) in DEADMAN_LOOT_INV_IDS.withIndex()) {
            val display = displayInventory(invId, if (index == 0) loot else emptyList())
            UpdateInventory.updateInvFull(player, display)
        }
    }

    private fun clearClientLootInventories(player: Player) {
        for (invId in DEADMAN_LOOT_INV_IDS) {
            UpdateInventory.updateInvStopTransmit(player, invId)
        }
    }

    private fun displayInventory(invId: Int, loot: List<InvObj>): Inventory {
        val type = checkNotNull(ServerCacheManager.getInventory(invId)) {
            "Missing native PvP loot inventory $invId"
        }
        val objs = arrayOfNulls<InvObj>(type.size)
        for ((slot, item) in loot.take(objs.size).withIndex()) {
            objs[slot] = InvObj(item)
        }
        return Inventory(type, objs)
    }

    private fun marketValue(item: InvObj): Long {
        val type = getInvObj(item)
        val each = (marketPrices[type] ?: type.cost).toLong().coerceAtLeast(1L)
        return each * item.count.toLong()
    }

    private companion object {
        const val LOOT_INTERFACE = "interface.wildy_loot_chest"
        const val ITEMS_COMPONENT = "component.wildy_loot_chest:items"
        const val ITEMS_EMPTY_COMPONENT = "component.wildy_loot_chest:items_empty"
        const val DESTROY_COMPONENT = "component.wildy_loot_chest:destroy"
        const val WITHDRAW_ITEM_COMPONENT = "component.wildy_loot_chest:withdrawitem"
        const val WITHDRAW_NOTE_COMPONENT = "component.wildy_loot_chest:withdrawnote"
        const val WITHDRAW_INV_COMPONENT = "component.wildy_loot_chest:withdrawinv"
        const val WITHDRAW_BANK_COMPONENT = "component.wildy_loot_chest:withdrawbank"
        const val CONTROLS_GREYOUT_LAYER_COMPONENT =
            "component.wildy_loot_chest:controls_greyout_layer"
        const val CONFIRM_LAYER_COMPONENT = "component.wildy_loot_chest:confirm_layer"
        const val CONFIRM_TITLE_COMPONENT = "component.wildy_loot_chest:confirm_title"
        const val CONFIRM_BODY_COMPONENT = "component.wildy_loot_chest:confirm_body"
        const val DESTROY_CONFIRM_COMPONENT = "component.wildy_loot_chest:destroy_confirm"
        const val DESTROY_CANCEL_COMPONENT = "component.wildy_loot_chest:destroy_cancel"

        val DEADMAN_LOOT_INV_IDS: List<Int> = listOf(558, 559, 560, 561, 562)
        const val DEADMAN_LOOT_CAPACITY = 128
    }
}
