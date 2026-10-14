package org.rsmod.content.skills.woodcutting.scripts

import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.type.getInvObj

internal object ForestrySupplies {
    fun has(player: Player, symbol: String): Boolean = player.inv.count(symbol) > 0

    fun remove(player: Player, symbols: Collection<String>) {
        for (slot in player.inv.indices) {
            val obj = player.inv[slot] ?: continue
            if (getInvObj(obj).internalName in symbols) player.inv[slot] = null
        }
    }

    fun gather(player: Player, c: ForestryContribution, ingredient: Int): Boolean {
        val previous = ForestryAssets.mulch.getOrNull(c.ingredients.size - 1)
        if (c.ingredients.isNotEmpty() && previous != null && !has(player, previous)) {
            c.ingredients.clear()
        }
        if (c.ingredients.size >= 3) return false
        val current = ForestryAssets.mulch.getOrNull(c.ingredients.size - 1)
        val slot = player.inv.indices.firstOrNull {
            player.inv[it]?.let { obj -> getInvObj(obj).internalName == current } == true
        } ?: player.inv.indices.firstOrNull { player.inv[it] == null } ?: return false
        c.ingredients.add(ingredient)
        player.inv[slot] = InvObj(ForestryAssets.mulch[c.ingredients.size - 1])
        return true
    }

    fun takeEgg(player: Player): Boolean {
        if (has(player, ForestryAssets.EGG)) return false
        val slot = player.inv.indices.firstOrNull { player.inv[it] == null } ?: return false
        player.inv[slot] = InvObj(ForestryAssets.EGG)
        return true
    }

    fun deliverEgg(player: Player): Boolean {
        if (!has(player, ForestryAssets.EGG)) return false
        remove(player, listOf(ForestryAssets.EGG))
        return true
    }
}
