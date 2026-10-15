package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.types.InvScope
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.Inventory
import org.rsmod.game.type.getInvObj

/**
 * Never manufacture basket contents: only consume from a real, already populated
 * permanent inventory, and only while its matching basket is carried or worn.
 * This also supports a future native basket inventory without changing the event.
 */
internal object ForestryHiveSupplies {
    private val basketContainers = mapOf(
        "inv.log_basket" to "log_basket",
        "inv.forestry_basket" to "forestry_basket",
    )

    fun consumeLog(player: Player): String? {
        take(player.inv)?.let { return it }
        val equipped = (player.inv.objs.asSequence() + player.worn.objs.asSequence())
            .filterNotNull().map { getInvObj(it).internalName.lowercase() }.toSet()
        for ((storageKey, objectName) in basketContainers) {
            if (equipped.none { objectName in it }) continue
            val storage = player.invMap[storageKey] ?: continue
            if (storage.type.scope != InvScope.Perm) continue
            take(storage)?.let { return it }
        }
        return null
    }

    private fun take(inventory: Inventory): String? {
        val slot = inventory.indices.firstOrNull {
            inventory[it]?.let { item ->
                getInvObj(item).internalName in ForestryRules.logs
            } == true
        } ?: return null
        val current = inventory[slot] ?: return null
        val symbol = getInvObj(current).internalName
        inventory[slot] = if (current.count > 1) current.copy(count = current.count - 1)
            else null
        return symbol
    }
}
