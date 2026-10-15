package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import org.rsmod.api.attr.AttributeKey
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.type.getInvObj

/**
 * Persistent fallback for basket contents. The cache has no usable native log
 * basket inventory in some server revisions; a saved attribute is sufficient
 * because the basket only contains up to 28 individual logs.
 *
 * No logs are ever synthesized: every addition removes one from the inventory,
 * and every withdrawal removes the corresponding saved log.
 */
internal object ForestryLogBasket {
    const val CAPACITY = 28
    private val CONTENTS = AttributeKey<String>(persistenceKey = "forestry_log_basket_contents")
    private val OPEN = AttributeKey<Int>(persistenceKey = "forestry_log_basket_open")

    const val LOG_CLOSED = "obj.log_basket_closed"
    const val LOG_OPEN = "obj.log_basket_open"
    const val FORESTRY_CLOSED = "obj.forestry_basket_closed"
    const val FORESTRY_OPEN = "obj.forestry_basket_open"
    private val basketTypes = setOf(LOG_CLOSED, LOG_OPEN, FORESTRY_CLOSED, FORESTRY_OPEN)

    /** Match physical items in either inventory or equipment, never banked-only items. */
    fun hasBasket(player: Player): Boolean =
        player.inv.objs.asSequence().plus(player.worn.objs.asSequence())
            .filterNotNull().any { getInvObj(it).internalName in basketTypes }

    /** The OSRS item variant is authoritative, including after relogging. */
    fun isOpen(player: Player): Boolean =
        (player.inv.objs.asSequence() + player.worn.objs.asSequence())
            .filterNotNull().any {
                getInvObj(it).internalName in setOf(LOG_OPEN, FORESTRY_OPEN)
            }

    /** Migrate baskets saved by the earlier attribute-only implementation. */
    fun restoreLegacyOpenState(player: Player) {
        if (hasBasket(player) && player.attr[OPEN] == 1 && !isOpen(player)) {
            setOpen(player, true)
        }
    }

    /** Changes the native item appearance as well as persistent auto-collection state. */
    fun setOpen(player: Player, open: Boolean): Boolean {
        if (!hasBasket(player)) return false
        player.attr[OPEN] = if (open) 1 else 0
        for (inventory in listOf(player.inv, player.worn)) {
            for (slot in inventory.indices) {
                val old = inventory[slot] ?: continue
                val symbol = getInvObj(old).internalName
                val updated = when (symbol) {
                    LOG_CLOSED, LOG_OPEN -> if (open) LOG_OPEN else LOG_CLOSED
                    FORESTRY_CLOSED, FORESTRY_OPEN ->
                        if (open) FORESTRY_OPEN else FORESTRY_CLOSED
                    else -> continue
                }
                if (updated != symbol) inventory[slot] = InvObj(updated, old.count, old.vars)
            }
        }
        return true
    }

    fun toggleOpen(player: Player): Boolean {
        val open = !isOpen(player)
        return setOpen(player, open) && open
    }

    fun stored(player: Player): List<String> =
        player.attr[CONTENTS].orEmpty().split('|').filter { it in ForestryRules.logs }
            .take(CAPACITY)

    fun count(player: Player): Int = if (hasBasket(player)) stored(player).size else 0

    fun availableSpace(player: Player): Int =
        if (hasBasket(player)) CAPACITY - stored(player).size else 0

    fun add(player: Player, log: String): Boolean {
        if (log !in ForestryRules.logs || !hasBasket(player)) return false
        val values = stored(player).toMutableList()
        if (values.size >= CAPACITY) return false
        values.add(log)
        save(player, values)
        return true
    }

    /**
     * Deposits using the bank's own transactional insertion callback. Nothing is
     * removed from storage until the bank reports a successful deposit.
     * Stop on full banks or any transaction rejection.
     */
    fun depositToBank(player: Player, deposit: (String) -> Boolean): Int {
        if (!hasBasket(player)) return 0
        var moved = 0
        while (true) {
            val symbol = stored(player).firstOrNull() ?: break
            if (!deposit(symbol)) break
            check(consume(player) == symbol)
            moved++
        }
        return moved
    }

    fun consume(player: Player): String? {
        if (!hasBasket(player)) return null
        val values = stored(player).toMutableList()
        if (values.isEmpty()) return null
        val log = values.removeAt(0)
        save(player, values)
        return log
    }

    fun fill(player: Player): Int {
        if (!hasBasket(player)) return 0
        val values = stored(player).toMutableList()
        var moved = 0
        for (i in player.inv.indices) {
            if (values.size >= CAPACITY) break
            val obj = player.inv[i] ?: continue
            val name = getInvObj(obj).internalName
            if (name !in ForestryRules.logs) continue
            val take = minOf(obj.count, CAPACITY - values.size)
            if (take <= 0) continue
            repeat(take) { values.add(name) }
            player.inv[i] = if (obj.count > take) obj.copy(count = obj.count - take) else null
            moved += take
        }
        if (moved > 0) save(player, values)
        return moved
    }

    fun empty(player: Player): Int {
        if (!hasBasket(player)) return 0
        val values = stored(player).toMutableList()
        var moved = 0
        while (values.isNotEmpty()) {
            val slot = player.inv.indices.firstOrNull { player.inv[it] == null } ?: break
            val symbol = values.removeAt(0)
            // Only item definitions that exist in the current cache are usable.
            if (ServerCacheManager.getItems().values.none { it.internalName == symbol }) {
                values.add(0, symbol)
                break
            }
            player.inv[slot] = InvObj(symbol)
            moved++
        }
        if (moved > 0) save(player, values)
        return moved
    }

    private fun save(player: Player, logs: List<String>) {
        require(logs.size <= CAPACITY && logs.all { it in ForestryRules.logs })
        player.attr[CONTENTS] = logs.joinToString("|")
    }
}
