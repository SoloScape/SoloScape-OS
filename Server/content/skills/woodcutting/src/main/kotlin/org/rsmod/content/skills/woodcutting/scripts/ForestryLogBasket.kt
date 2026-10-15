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

    fun hasBasket(player: Player): Boolean =
        (player.inv.objs.asSequence() + player.worn.objs.asSequence())
            .filterNotNull().any {
                val name = getInvObj(it).internalName.lowercase()
                name.contains("log_basket") || name.contains("forestry_basket")
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
