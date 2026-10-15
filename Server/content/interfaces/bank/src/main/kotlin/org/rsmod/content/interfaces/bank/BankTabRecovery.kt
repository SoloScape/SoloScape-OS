package org.rsmod.content.interfaces.bank

import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.game.entity.Player

/**
 * Reconcile historical bank inventories whose saved tab-size varbits do not
 * cover all of their actual items. Named tabs are preserved; only the trailing
 * Main tab expands to account for orphaned slots.
 *
 * Must run before a bank item is removed: once the last object is withdrawn
 * there is no longer enough information to recover its original slot.
 *
 * @return the number of slots recovered into Main.
 */
fun Player.repairBankTabSizes(): Int {
    val bank = invMap.getOrPut("inv.bank")
    // Inventory.lastOccupiedSlot() is the *exclusive* end, not a slot index:
    // 0 for an empty bank and 3 when slot 2 is the final occupied slot.
    val occupiedEnd = bank.lastOccupiedSlot()
    if (occupiedEnd == 0) return 0

    val tracked = BankTab.entries.sumOf { tab -> vars[tab.sizeVarBit] }
    val missing = (occupiedEnd - tracked).coerceAtLeast(0)
    if (missing > 0) {
        VarPlayerIntMapSetter.set(this, BankTab.Main.sizeVarBit, vars[BankTab.Main.sizeVarBit] + missing)
    }
    return missing
}
