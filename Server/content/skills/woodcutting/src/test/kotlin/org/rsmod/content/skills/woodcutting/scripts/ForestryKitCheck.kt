package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.InvScope
import org.rsmod.api.inv.storage.PlayerItemStorage
import org.rsmod.api.invtx.InvTransactionsScript
import org.rsmod.events.EventBus
import org.rsmod.game.cheat.CheatCommandMap
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.queue.EngineQueueCache
import org.rsmod.plugin.scripts.ScriptContext

private fun kitPlayer(worn: Boolean): Player = Player().apply {
    inv = invMap.getOrPut("inv.inv")
    this.worn = invMap.getOrPut("inv.worn")
    if (worn) this.worn[1] = InvObj(ForestryRations.KIT)
    else inv[0] = InvObj(ForestryRations.KIT)
}

fun main() {
    ServerCacheManager.init(240).close()
    with(InvTransactionsScript(PlayerItemStorage(emptySet()))) {
        ScriptContext(EventBus(), CheatCommandMap(), EngineQueueCache()).startup()
    }
    val events = EventBus()
    with(ForestryKitRations(events)) {
        ScriptContext(events, CheatCommandMap(), EngineQueueCache()).startup()
    }
    val items = ForestryKitRations.STORED_ITEMS
    check(items.values.containsAll(listOf(
        "obj.forestry_currency", "obj.nature_offerings", "obj.forestry_secateurs_attachment",
    )))
    val nativeList = ServerCacheManager.getEnum(817)!!
    for ((index, item) in items) {
        check(nativeList.values[index + 1] == item.asRSCM(RSCMType.OBJ))
    }
    for (worn in listOf(false, true)) {
        val player = kitPlayer(worn)
        val storage = player.invMap.getOrPut(ForestryRations.STORAGE)
        check(storage.type.scope == InvScope.Perm)
        for ((slot, item) in items.values.withIndex()) player.inv[slot + 1] = InvObj(item, 15)
        player.inv[20] = InvObj("obj.logs")
        check(ForestryKitRations.fillKit(player) == items.size)
        check(player.inv.count("obj.logs") == 1)
        check(ForestryKitRations.fillKit(player) == 0)
        for (item in items.values) {
            check(player.inv.count(item) == 0)
            check(storage.count(item) == 15)
            player.inv[10] = InvObj(item, 5)
            check(ForestryKitRations.depositItem(player, 10))
            check(player.inv[10] == null)
            check(storage.count(item) == 20)
            check(ForestryKitRations.withdrawItem(player, item, 1))
            check(ForestryKitRations.withdrawItem(player, item, 5))
            check(player.inv.count(item) == 6)
            check(storage.count(item) == 14)
            check(!ForestryKitRations.withdrawItem(player, item, 0))
            check(ForestryKitRations.withdrawItem(player, item, 14))
            check(storage.count(item) == 0)
            check(player.inv.count(item) == 20)
        }
        check(!ForestryKitRations.depositItem(player, 20))
    }
    val full = kitPlayer(true)
    val storage = full.invMap.getOrPut(ForestryRations.STORAGE)
    storage[0] = InvObj("obj.leaves", 20)
    full.inv.indices.forEach { full.inv[it] = InvObj("obj.bucket_empty") }
    check(!ForestryKitRations.withdrawItem(full, "obj.leaves", 5))
    check(storage.count("obj.leaves") == 20)
    full.inv[0] = InvObj("obj.leaves", 10)
    full.worn[1] = null
    check(!ForestryKitRations.depositItem(full, 0))
    check(!ForestryKitRations.withdrawItem(full, "obj.leaves", 5))
    check(full.inv.count("obj.leaves") == 10)
    check(storage.count("obj.leaves") == 20)
    println("PASS: kit Fill, bark, offerings, secateurs attachment, all six leaf types and rations, native list indices, carried/worn kits, stack merging, withdrawals and rejected transfers.")
}
