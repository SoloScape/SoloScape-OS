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
    check(player.inv[0]?.id == ServerCacheManager.getItems().values.first {
        it.internalName == ForestryLogBasket.LOG_OPEN
    }.id)
    check(ForestryLogBasket.toggleOpen(player) == false)
    check(!ForestryLogBasket.isOpen(player))
    check(player.inv[0]?.id == ServerCacheManager.getItems().values.first {
        it.internalName == ForestryLogBasket.LOG_CLOSED
    }.id)
    check(ForestryLogBasket.toggleOpen(player))
    check(ForestryLogBasket.isOpen(player))
    // Item graphic, not a separately persisted flag, controls auto-collection.
    player.inv[0] = InvObj(ForestryLogBasket.LOG_CLOSED)
    check(!ForestryLogBasket.isOpen(player))
    player.inv[0] = InvObj(ForestryLogBasket.LOG_OPEN)
    check(ForestryLogBasket.isOpen(player))
    player.inv[0] = InvObj(ForestryLogBasket.LOG_CLOSED)
    ForestryLogBasket.restoreLegacyOpenState(player)
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
    val forestry = ServerCacheManager.getItems().values.first {
        it.internalName == ForestryLogBasket.FORESTRY_CLOSED
    }
    // Both variants share exactly the same storage; equipped-only baskets work.
    player.inv[0] = null
    player.worn[1] = InvObj(forestry.internalName)
    check(ForestryLogBasket.count(player) == 28)
    check(ForestryLogBasket.setOpen(player, true))
    check(player.worn[1]?.id == ServerCacheManager.getItems().values.first {
        it.internalName == ForestryLogBasket.FORESTRY_OPEN
    }.id)
    check(ForestryHiveSupplies.consumeLog(player) == "obj.logs")
    check(ForestryLogBasket.count(player) == 27)
    check(ForestryLogBasket.setOpen(player, false))
    check(player.worn[1]?.id == forestry.id)
    player.worn[1] = null
    player.inv[0] = InvObj(item.internalName)
    check(ForestryLogBasket.count(player) == 27)
    // One non-log item occupies another slot, so one log must stay stored.
    player.inv[1] = InvObj("obj.rune_axe")
    check(ForestryLogBasket.empty(player) == 26)
    check(ForestryLogBasket.count(player) == 1)
    check(ForestryLogBasket.empty(player) == 0)
    check(ForestryLogBasket.consume(player) == "obj.logs")
    check(ForestryLogBasket.count(player) == 0)
    // A rejected/full-bank transaction must not consume any stored logs.
    check(ForestryLogBasket.add(player, "obj.logs"))
    check(ForestryLogBasket.add(player, "obj.magic_logs"))
    check(ForestryLogBasket.add(player, "obj.oak_logs"))
    check(ForestryLogBasket.count(player) == 3)
    var received = 0
    val moved = ForestryLogBasket.depositToBank(player) {
        if (received >= 2) false else { received++; true }
    }
    check(moved == 2 && received == 2)
    check(ForestryLogBasket.stored(player) == listOf("obj.oak_logs"))
    check(ForestryLogBasket.depositToBank(player) { false } == 0)
    check(ForestryLogBasket.count(player) == 1)
    val last = mutableListOf<String>()
    check(ForestryLogBasket.depositToBank(player) { last.add(it) } == 1)
    check(last == listOf("obj.oak_logs"))
    check(ForestryLogBasket.count(player) == 0)
    player.inv[0] = null
    check(ForestryLogBasket.depositToBank(player) { true } == 0)
    println("Forestry Log Basket checks passed: 28-log shared storage, native open/closed item transformations, worn variant, fill/empty and Beehive consumption.")
}
