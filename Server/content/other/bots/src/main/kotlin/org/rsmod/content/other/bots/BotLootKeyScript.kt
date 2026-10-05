package org.rsmod.content.other.bots

import jakarta.inject.Inject
import org.rsmod.api.invtx.invTransaction
import org.rsmod.api.market.MarketPrices
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.script.advanced.onDestroyHeld
import org.rsmod.api.script.onOpHeld1
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpLocU
import org.rsmod.game.inv.InvObj
import org.rsmod.game.type.getInvObj
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

internal class BotLootKeyScript
@Inject
constructor(
    private val store: BotLootKeyStore,
    private val marketPrices: MarketPrices,
) : PluginScript() {
    override fun ScriptContext.startup() {
        for (key in BotLootKeys.types) {
            onOpHeld1(key) { checkKey(it.slot) }
        }
        onDestroyHeld {
            if (type in BotLootKeys.types) {
                store.remove(obj.vars)
            }
        }
        for (chest in BotLootKeys.chests) {
            onOpLoc1(chest) { redeemFirstKey() }
            for (key in BotLootKeys.types) {
                onOpLocU(chest, key) { redeemKey(it.invSlot) }
            }
        }
    }

    private fun ProtectedAccess.checkKey(slot: Int) {
        val key = inv[slot]
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

    private fun ProtectedAccess.redeemFirstKey() {
        val slot = inv.indices.firstOrNull { BotLootKeys.isKey(inv[it]) }
        if (slot == null) {
            mes("You do not have a loot key to open.")
            return
        }
        redeemKey(slot)
    }

    private fun ProtectedAccess.redeemKey(slot: Int) {
        val key = inv[slot]
        if (!BotLootKeys.isKey(key)) return
        val loot = store.get(key.vars)
        if (loot == null) {
            mes("This loot key no longer has any stored loot.")
            return
        }

        val transaction =
            player.invTransaction(inv, autoCommit = false) {
                val target = select(inv)
                delete(
                    inv = target,
                    obj = key.id,
                    count = 1,
                    slot = slot,
                    strict = true,
                    placehold = false,
                )
                for (item in loot) {
                    add(
                        inv = target,
                        obj = item.id,
                        count = item.count,
                        vars = item.vars,
                        slot = null,
                        strict = true,
                        cert = false,
                        uncert = false,
                    )
                }
            }
        if (transaction.failure) {
            mes("You need more inventory space to retrieve all of this loot.")
            return
        }
        transaction.commitAll()
        store.remove(key.vars)
        mes("You retrieve the loot stored in the key.")
    }

    private fun marketValue(item: InvObj): Long {
        val type = getInvObj(item)
        val each = (marketPrices[type] ?: type.cost).toLong().coerceAtLeast(1L)
        return each * item.count.toLong()
    }
}
