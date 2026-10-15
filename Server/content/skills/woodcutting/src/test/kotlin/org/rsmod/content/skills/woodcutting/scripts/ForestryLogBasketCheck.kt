package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj

fun main() {
    ServerCacheManager.init(240).close()
    val item = ServerCacheManager.getItems().values.firstOrNull {
        it.name.equals("Log basket", ignoreCase = true)
    } ?: error("Log basket item missing from native cache")

    val player = Player().apply {
        inv = invMap.getOrPut("inv.inv")
        worn = invMap.getOrPut("inv.worn")
    }
    check(!ForestryLogBasket.hasBasket(player))
    check(ForestryLogBasket.fill(player) == 0)
    player.inv[0] = InvObj(item.internalName)
    check(ForestryLogBasket.hasBasket(player))
    check(!ForestryLogBasket.isOpen(player))
    check(ForestryLogBasket.toggleOpen(player))
    check(ForestryLogBasket.isOpen(player))

    player.inv[1] = InvObj("obj.logs")
    player.inv[2] = InvObj("obj.magic_logs")
    check(ForestryLogBasket.fill(player) == 2)
    check(ForestryLogBasket.count(player) == 2)
    check(ForestryLogBasket.stored(player) == listOf("obj.logs", "obj.magic_logs"))
    check(ForestryHiveSupplies.availableLogs(player) == 2)
    check(player.inv[1] == null && player.inv[2] == null)

    check(ForestryHiveSupplies.consumeLog(player) == "obj.logs")
    check(ForestryLogBasket.count(player) == 1)
    check(ForestryLogBasket.empty(player) == 1)
    check(player.inv.count("obj.magic_logs") == 1)
    check(ForestryHiveSupplies.availableLogs(player) == 1)
    check(ForestryLogBasket.count(player) == 0)
    check(ForestryLogBasket.empty(player) == 0)

    player.inv[1] = null
    player.inv[2] = null
    for (i in 0 until 28) check(ForestryLogBasket.add(player, "obj.logs"))
    check(!ForestryLogBasket.add(player, "obj.logs"))
    check(ForestryLogBasket.count(player) == 28)
    // The permanent basket is only available while the actual item is carried.
    player.inv[0] = null
    check(ForestryHiveSupplies.availableLogs(player) == 0)
    check(ForestryLogBasket.consume(player) == null)
    player.inv[0] = InvObj(item.internalName)
    check(ForestryLogBasket.count(player) == 28)
    check(ForestryLogBasket.empty(player) == 27)
    check(ForestryLogBasket.count(player) == 1)
    check(ForestryLogBasket.empty(player) == 0)
    check(ForestryLogBasket.consume(player) == "obj.logs")
    check(ForestryLogBasket.count(player) == 0)
    println("Forestry Log Basket checks passed: persistent 28-log capacity, nonduplication, open/close, fill/empty and Beehive consumption.")
}
