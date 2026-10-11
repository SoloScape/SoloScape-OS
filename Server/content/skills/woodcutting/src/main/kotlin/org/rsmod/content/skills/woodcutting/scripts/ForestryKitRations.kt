package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.types.InvScope
import org.rsmod.api.invtx.invTransfer
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.script.onOpHeld1
import org.rsmod.api.script.onOpHeld3
import org.rsmod.api.script.onOpHeldU
import org.rsmod.api.script.onOpWorn2
import org.rsmod.api.script.onOpWorn3
import org.rsmod.game.entity.Player
import org.rsmod.game.type.getInvObj
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class ForestryKitRations : PluginScript() {
    override fun ScriptContext.startup() {
        onOpHeldU(ForestryRations.RATION, ForestryRations.KIT) { deposit(it.firstSlot) }
        onOpHeld1(ForestryRations.KIT) { inspect() }
        onOpHeld3(ForestryRations.KIT) { fill() }
        onOpWorn2(ForestryRations.KIT) { inspect() }
        onOpWorn3(ForestryRations.KIT) { fill() }
    }

    private fun ProtectedAccess.fill() {
        val slots = inv.indices.filter {
            inv[it]?.let { item -> getInvObj(item).internalName == ForestryRations.RATION } == true
        }
        if (slots.isEmpty()) {
            mes("You have no forester's rations to store.")
            return
        }
        slots.forEach { deposit(it) }
    }

    private fun ProtectedAccess.deposit(slot: Int) {
        if (depositRations(player, slot)) mes("You store your forester's rations in the kit.")
        else mes("Your kit cannot store these rations right now.")
    }

    private suspend fun ProtectedAccess.inspect() {
        val stored = player.invMap[ForestryRations.STORAGE]
        val count = stored?.count(ForestryRations.RATION) ?: 0
        mes("Your kit contains $count forester's rations.")
        if (count == 0) return
        val amount = countDialog("How many rations would you like to withdraw?").coerceIn(0, count)
        if (amount > 0 && !withdrawRations(player, amount)) {
            mes("You do not have enough inventory space for the rations.")
        }
    }

    companion object {
        fun depositRations(player: Player, slot: Int): Boolean {
            if (!ForestryRations.hasKit(player)) return false
            val ration = player.inv[slot] ?: return false
            if (getInvObj(ration).internalName != ForestryRations.RATION) return false
            val storage = player.invMap.getOrPut(ForestryRations.STORAGE)
            if (storage.type.scope != InvScope.Perm) return false
            return player.invTransfer(player.inv, slot, ration.count, storage).success
        }

        fun withdrawRations(player: Player, amount: Int): Boolean {
            if (amount <= 0 || !ForestryRations.hasKit(player)) return false
            val storage = player.invMap[ForestryRations.STORAGE] ?: return false
            val slot = storage.indices.firstOrNull {
                storage[it]?.let { item -> getInvObj(item).internalName == ForestryRations.RATION } == true
            } ?: return false
            return player.invTransfer(storage, slot, amount, player.inv).success
        }
    }
}
