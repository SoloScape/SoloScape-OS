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

    /**
     * Inventory, persistent log basket, and any cache-backed native basket.
     * Use actual per-type quantities to populate the native Beehive Make-X
     * interface. Preserve inventory ordering and never invent missing logs.
     */
    fun availableByType(player: Player): Map<String, Int> {
        val result = linkedMapOf<String, Int>()
        fun include(symbol: String, count: Int) {
            if (symbol in ForestryRules.logs && count > 0) {
                result[symbol] = (result[symbol] ?: 0) + count
            }
        }
        fun includeInventory(inventory: Inventory) {
            for (obj in inventory.objs.filterNotNull()) {
                include(getInvObj(obj).internalName, obj.count)
            }
        }
        includeInventory(player.inv)
        for (symbol in ForestryLogBasket.stored(player).takeIf {
            ForestryLogBasket.hasBasket(player)
        }.orEmpty()) {
            include(symbol, 1)
        }
        val carried = (player.inv.objs.asSequence() + player.worn.objs.asSequence())
            .filterNotNull().map { getInvObj(it).internalName.lowercase() }.toSet()
        for ((storageKey, objectName) in basketContainers) {
            if (carried.none { objectName in it }) continue
            val storage = runCatching { player.invMap[storageKey] }.getOrNull() ?: continue
            if (storage.type.scope == InvScope.Perm) includeInventory(storage)
        }
        return result
    }

    fun availableLogs(player: Player): Int = availableByType(player).values.sum()

    fun availableLogs(player: Player, symbol: String): Int =
        availableByType(player)[symbol] ?: 0

    /** Selection is material-specific: never silently take a different log. */
    fun consumeLog(player: Player, symbol: String? = null): String? {
        take(player.inv, symbol)?.let { return it }
        ForestryLogBasket.consume(player, symbol)?.let { return it }
        val carried = (player.inv.objs.asSequence() + player.worn.objs.asSequence())
            .filterNotNull().map { getInvObj(it).internalName.lowercase() }.toSet()
        for ((storageKey, objectName) in basketContainers) {
            if (carried.none { objectName in it }) continue
            val storage = runCatching { player.invMap[storageKey] }.getOrNull() ?: continue
            if (storage.type.scope != InvScope.Perm) continue
            take(storage, symbol)?.let { return it }
        }
        return null
    }

    private fun take(inventory: Inventory, requested: String? = null): String? {
        val slot = inventory.indices.firstOrNull {
            inventory[it]?.let { item ->
                val symbol = getInvObj(item).internalName
                symbol in ForestryRules.logs && (requested == null || symbol == requested)
            } == true
        } ?: return null
        val current = inventory[slot] ?: return null
        val symbol = getInvObj(current).internalName
        inventory[slot] = if (current.count > 1) current.copy(count = current.count - 1)
            else null
        return symbol
    }
}
