package org.rsmod.api.player.output

import java.util.BitSet
import net.rsprot.protocol.common.game.outgoing.inv.InventoryObject
import net.rsprot.protocol.game.outgoing.inv.UpdateInvFull
import net.rsprot.protocol.game.outgoing.inv.UpdateInvPartial
import net.rsprot.protocol.game.outgoing.inv.UpdateInvStopTransmit
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory

public object UpdateInventory {
    /** @see [UpdateInvFull] */
    public fun updateInvFull(player: Player, inv: Inventory) {
        val highestSlot = inv.lastOccupiedSlot()
        if (highestSlot > MAX_FULL_SLOTS) {
            player.client.write(
                UpdateInvFull(-(1234 + inv.type.id), inv.type.id, 0, RspObjProvider(inv.objs))
            )
            writePartial(player, inv, (0 until highestSlot).asSequence())
            return
        }
        val provider = RspObjProvider(inv.objs)
        val message = UpdateInvFull(-(1234 + inv.type.id), inv.type.id, highestSlot, provider)
        player.client.write(message)
    }

    /**
     * Sends [inv] as a "mirrored" inventory: the client files it under the partner's copy of the
     * same inv id (what clientscripts read with `invother_*`), which is how the trade screens show
     * the other player's offer next to your own.
     */
    public fun updateInvFullMirror(player: Player, inv: Inventory) {
        updateInvFullMirrorAs(player, inv, inv.type.id)
    }

    /**
     * Sends [inv]'s contents to the client under a different inventory id, [asInvId]. Useful when
     * a cache interface is hard-wired to one inv id but the server keeps the objs elsewhere (a
     * persisted holding inventory shown through the trade screen, for example). Nothing keeps the
     * client copy in sync afterwards; call again after every change.
     */
    public fun updateInvFullAs(player: Player, inv: Inventory, asInvId: Int) {
        val message = UpdateInvFull(-(1234 + asInvId), asInvId, inv.lastOccupiedSlot(), RspObjProvider(inv.objs))
        player.client.write(message)
    }

    /** Mirrored variant of [updateInvFullAs]; see [updateInvFullMirror]. */
    public fun updateInvFullMirrorAs(player: Player, inv: Inventory, asInvId: Int) {
        val message = UpdateInvFull(MIRROR_ID_OFFSET - asInvId, asInvId, inv.lastOccupiedSlot(), RspObjProvider(inv.objs))
        player.client.write(message)
    }

    /** Tells the client to forget an inventory it was shown under [invId]. */
    public fun updateInvStopTransmit(player: Player, invId: Int) {
        player.client.write(UpdateInvStopTransmit(invId))
    }

    /** rsprot documents any combined id below -70000 as marking a mirrored inventory. */
    private const val MIRROR_ID_OFFSET: Int = -(70_000 + 1234)

    /** @see [UpdateInvPartial] */
    public fun updateInvPartial(player: Player, inv: Inventory) {
        writePartial(player, inv, inv.modifiedSlots.asSequence())
    }

    // Max stacks use seven bytes per full slot, or nine with a partial slot index.
    private const val MAX_FULL_SLOTS = 8000
    private const val PARTIAL_CHUNK_SLOTS = 5000

    private fun writePartial(player: Player, inv: Inventory, slots: Sequence<Int>) {
        for (chunk in slots.chunked(PARTIAL_CHUNK_SLOTS)) {
            val provider = RspIndexedObjProvider(inv.objs, chunk.iterator())
            player.client.write(UpdateInvPartial(-1, -(1234 + inv.type.id), inv.type.id, provider))
        }
    }

    /** @see [UpdateInvStopTransmit] */
    public fun updateInvStopTransmit(player: Player, inv: Inventory) {
        player.client.write(UpdateInvStopTransmit(inv.type.id))
    }

    /**
     * Mostly used for emulation when re-syncing an inventory. [slot] is usually sent as value `0`.
     */
    public fun resendSlot(inv: Inventory, slot: Int) {
        inv.modifiedSlots.set(slot)
    }
}

private fun BitSet.asSequence(): Sequence<Int> = sequence {
    var index = nextSetBit(0)
    while (index >= 0) {
        yield(index)
        index = nextSetBit(index + 1)
    }
}

private class RspObjProvider(private val objs: Array<InvObj?>) : UpdateInvFull.ObjectProvider {
    override fun provide(slot: Int): Long {
        val obj = objs.getOrNull(slot) ?: return InventoryObject.NULL
        return InventoryObject(slot, obj.id, obj.count)
    }
}

private class RspIndexedObjProvider(private val objs: Array<InvObj?>, updateSlots: Iterator<Int>) :
    UpdateInvPartial.IndexedObjectProvider(updateSlots) {
    override fun provide(slot: Int): Long {
        val obj = objs.getOrNull(slot) ?: return InventoryObject(slot, -1, -1)
        return InventoryObject(slot, obj.id, obj.count)
    }
}
