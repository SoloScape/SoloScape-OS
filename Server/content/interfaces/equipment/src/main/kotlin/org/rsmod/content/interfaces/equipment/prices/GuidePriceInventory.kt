package org.rsmod.content.interfaces.equipment.prices

import org.rsmod.api.invtx.InvTransactions
import org.rsmod.api.invtx.moveAll
import org.rsmod.api.invtx.select
import org.rsmod.api.invtx.transfer
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory
import org.rsmod.objtx.TransactionResultList

internal class GuidePriceInventory(private val transactions: InvTransactions) {
    fun moveSlot(
        from: Inventory,
        into: Inventory,
        slot: Int,
        count: Int,
        compress: Boolean = false,
    ): TransactionResultList<InvObj> = transactions.transaction(autoCommit = true) {
        val source = select(from)
        transfer(from = source, into = select(into), fromSlot = slot, count = count, strict = false)
        if (compress) {
            compact {
                this.from = source
                startSlot = 0
                endSlot = from.size - 1
            }
        }
    }

    fun moveAll(
        from: Inventory,
        into: Inventory,
        keepSlots: Set<Int>? = null,
    ): TransactionResultList<InvObj> = transactions.transaction(autoCommit = true) {
        moveAll(from = select(from), into = select(into), keepSlots = keepSlots)
    }
}
