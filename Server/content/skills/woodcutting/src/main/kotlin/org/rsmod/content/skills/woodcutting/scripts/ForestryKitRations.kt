package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.definition.type.widget.IfEvent
import dev.openrune.types.InvScope
import jakarta.inject.Inject
import org.rsmod.api.invtx.invTransfer
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.startInvTransmit
import org.rsmod.api.player.stopInvTransmit
import org.rsmod.api.player.ui.ifOpenMainSidePair
import org.rsmod.api.player.ui.ifSetEvents
import org.rsmod.api.player.vars.intVarBit
import org.rsmod.api.script.onIfClose
import org.rsmod.api.script.onIfModalButton
import org.rsmod.api.script.onIfOpen
import org.rsmod.api.script.onOpHeld1
import org.rsmod.api.script.onOpHeld3
import org.rsmod.api.script.onOpHeldU
import org.rsmod.api.script.onOpWorn2
import org.rsmod.api.script.onOpWorn3
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player
import org.rsmod.game.type.getInvObj
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

/**
 * Open the native Forestry kit (main interface 823, side 822, kit inventory 814).
 * The kit's Open option must not launch the old chatbox withdrawal dialog.
 */
class ForestryKitRations @Inject constructor(private val eventBus: EventBus) : PluginScript() {
    private var Player.selectedKitItem by intVarBit("varbit.forestry_kit_selected_item")

    override fun ScriptContext.startup() {
        STORED_ITEMS.values.forEach { item ->
            onOpHeldU(item, ForestryRations.KIT) { deposit(it.firstSlot) }
        }
        onOpHeld1(ForestryRations.KIT) { openKit() }
        onOpHeld3(ForestryRations.KIT) { fill() }
        onOpWorn2(ForestryRations.KIT) { openKit() }
        onOpWorn3(ForestryRations.KIT) { fill() }

        onIfOpen(MAIN) {
            val storage = player.invMap.getOrPut(ForestryRations.STORAGE)
            player.startInvTransmit(storage)
            player.ifSetEvents(LIST, 0..14, IfEvent.Op1)
            player.ifSetEvents(SIDE_ITEMS, player.inv.indices, IfEvent.Op1)
        }
        onIfClose(MAIN) {
            player.invMap[ForestryRations.STORAGE]?.let { player.stopInvTransmit(it) }
        }

        onIfModalButton(LIST) {
            if (it.comsub in 0..14) player.selectedKitItem = it.comsub
        }
        onIfModalButton(SIDE_ITEMS) {
            if (it.obj?.internalName in STORED_ITEMS.values) deposit(it.comsub)
        }
        onIfModalButton(FILL) { fill() }
        onIfModalButton(EMPTY) { empty() }
        onIfModalButton(WITHDRAW_1) { withdraw(1) }
        onIfModalButton(WITHDRAW_5) { withdraw(5) }
        onIfModalButton(WITHDRAW_ALL) { withdraw(Int.MAX_VALUE) }
        onIfModalButton(WITHDRAW_X) {
            if (player.selectedKitItem !in STORED_ITEMS) return@onIfModalButton
            val amount = countDialog("How many would you like to withdraw?")
            if (amount > 0) withdraw(amount)
        }
    }

    private fun ProtectedAccess.openKit() {
        if (!ForestryRations.hasKit(player)) return
        player.selectedKitItem = 0
        player.ifOpenMainSidePair(MAIN, SIDE, -1, -1, eventBus)
    }

    private fun ProtectedAccess.fill() {
        when (fillKit(player)) {
            0 -> mes("You have no leaves or forester's rations to store.")
            -1 -> mes("Your kit cannot store these items right now.")
            else -> mes("You store your Forestry items in the kit.")
        }
    }

    private fun ProtectedAccess.deposit(slot: Int) {
        if (depositItem(player, slot)) mes("You store your Forestry items in the kit.")
        else mes("Your kit cannot store these items right now.")
    }

    private fun ProtectedAccess.empty() {
        var failed = false
        for (item in STORED_ITEMS.values) {
            val count = player.invMap[ForestryRations.STORAGE]?.count(item) ?: 0
            if (count > 0 && !withdrawItem(player, item, count)) failed = true
        }
        if (failed) mes("You do not have enough inventory space for the stored items.")
    }

    private fun ProtectedAccess.withdraw(amount: Int) {
        val item = STORED_ITEMS[player.selectedKitItem] ?: return
        val count = player.invMap[ForestryRations.STORAGE]?.count(item) ?: 0
        if (count <= 0) return
        if (!withdrawItem(player, item, minOf(count, amount))) {
            mes("You do not have enough inventory space for the stored items.")
        }
    }

    companion object {
        private const val MAIN = "interface.forestry_kit_main"
        private const val SIDE = "interface.forestry_kit_side"
        private const val LIST = "component.forestry_kit_main:list"
        private const val SIDE_ITEMS = "component.forestry_kit_side:items"
        private const val FILL = "component.forestry_kit_main:fill"
        private const val EMPTY = "component.forestry_kit_main:empty"
        private const val WITHDRAW_1 = "component.forestry_kit_main:1"
        private const val WITHDRAW_5 = "component.forestry_kit_main:5"
        private const val WITHDRAW_X = "component.forestry_kit_main:x"
        private const val WITHDRAW_ALL = "component.forestry_kit_main:all"
        internal val STORED_ITEMS = mapOf(
            2 to ForestryRations.RATION,
            4 to "obj.leaves",
            5 to "obj.leaves_oak",
            6 to "obj.leaves_willow",
            7 to "obj.leaves_maple",
            8 to "obj.leaves_yew",
            9 to "obj.leaves_magic",
        )

        internal fun fillKit(player: Player): Int {
            val slots = player.inv.indices.filter {
                player.inv[it]?.let { item -> getInvObj(item).internalName in STORED_ITEMS.values } == true
            }
            if (slots.isEmpty()) return 0
            return if (slots.map { depositItem(player, it) }.all { it }) slots.size else -1
        }

        fun depositRations(player: Player, slot: Int): Boolean {
            val item = player.inv[slot] ?: return false
            if (getInvObj(item).internalName != ForestryRations.RATION) return false
            return depositItem(player, slot)
        }

        internal fun depositItem(player: Player, slot: Int): Boolean {
            if (!ForestryRations.hasKit(player)) return false
            val item = player.inv[slot] ?: return false
            if (getInvObj(item).internalName !in STORED_ITEMS.values) return false
            val storage = player.invMap.getOrPut(ForestryRations.STORAGE)
            if (storage.type.scope != InvScope.Perm) return false
            return player.invTransfer(player.inv, slot, item.count, storage).success
        }

        fun withdrawRations(player: Player, amount: Int): Boolean {
            return withdrawItem(player, ForestryRations.RATION, amount)
        }

        internal fun withdrawItem(player: Player, item: String, amount: Int): Boolean {
            if (item !in STORED_ITEMS.values) return false
            if (amount <= 0 || !ForestryRations.hasKit(player)) return false
            val storage = player.invMap[ForestryRations.STORAGE] ?: return false
            val slot = storage.indices.firstOrNull {
                storage[it]?.let { obj -> getInvObj(obj).internalName == item } == true
            } ?: return false
            return player.invTransfer(storage, slot, amount, player.inv).success
        }
    }
}
