package org.rsmod.content.skills.woodcutting.scripts

import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory
import org.rsmod.game.type.getInvObj

object ForestryRations {
    const val RATION = "obj.forestry_ration"
    const val KIT = "obj.forestry_kit"
    const val STORAGE = "inv.forestry_kit"

    fun hasKit(player: Player): Boolean =
        KIT in player.inv || KIT in player.worn

    fun available(player: Player): Boolean =
        RATION in player.inv ||
            (hasKit(player) && player.invMap[STORAGE]?.contains(RATION) == true)

    fun consume(player: Player): Boolean =
        removeOne(player.inv) ||
            (hasKit(player) && player.invMap[STORAGE]?.let(::removeOne) == true)

    private fun removeOne(inventory: Inventory): Boolean {
        val slot = inventory.indices.firstOrNull {
            inventory[it]?.let { item -> getInvObj(item).internalName == RATION } == true
        } ?: return false
        val ration = inventory[slot]!!
        inventory[slot] = if (ration.count == 1) null else ration.copy(count = ration.count - 1)
        return true
    }
}
