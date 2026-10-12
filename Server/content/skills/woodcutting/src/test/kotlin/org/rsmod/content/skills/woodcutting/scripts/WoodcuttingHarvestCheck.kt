package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.InvScope
import org.rsmod.api.inv.storage.PlayerItemStorage
import org.rsmod.api.invtx.InvTransactionsScript
import org.rsmod.api.player.events.skilling.SkillingActionCompleteEvent
import org.rsmod.api.player.events.skilling.SkillingActionContext
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.protect.ProtectedAccessContextFactory
import org.rsmod.api.player.skilling.skillingProductCount
import org.rsmod.api.random.GameRandom
import org.rsmod.api.stats.xpmod.XpModifiers
import org.rsmod.coroutine.GameCoroutine
import org.rsmod.events.EventBus
import org.rsmod.game.cheat.CheatCommandMap
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.loc.LocEntity
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.queue.EngineQueueCache
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.ScriptContext

private class HarvestRoll(private val roll: Int) : GameRandom {
    override fun of(maxExclusive: Int): Int = roll.coerceAtMost(maxExclusive - 1)
    override fun of(minInclusive: Int, maxInclusive: Int): Int = minInclusive
    override fun randomDouble(): Double = 0.0
}

private fun harvestPlayer(): Player = Player().apply {
    inv = invMap.getOrPut("inv.inv")
    worn = invMap.getOrPut("inv.worn")
    for (stat in listOf("stat.woodcutting", "stat.firemaking")) {
        statMap.setBaseLevel(stat, 99)
        statMap.setCurrentLevel(stat, 99)
    }
}

fun main() {
    ServerCacheManager.init(240).close()
    with(InvTransactionsScript(PlayerItemStorage(emptySet()))) {
        ScriptContext(EventBus(), CheatCommandMap(), EngineQueueCache()).startup()
    }
    // Fail at startup if any native Forestry kit interface/component gameval is
    // missing or misspelled (main 823, side 822, and quantity buttons).
    val uiEvents = EventBus()
    with(ForestryKitRations(uiEvents)) {
        ScriptContext(uiEvents, CheatCommandMap(), EngineQueueCache()).startup()
    }
    val treeType = ServerCacheManager.getObjects().values.first {
        it.isContentType("content.tree")
    }
    val tree = BoundLocInfo(LocInfo(2, CoordGrid(3200, 3200), LocEntity(treeType.id, 10, 0)), treeType)
    val logs = ServerCacheManager.getItem("obj.logs".asRSCM(RSCMType.OBJ))!!
    val harvest = WoodcuttingHarvest(XpModifiers(emptySet()))

    for (worn in listOf(false, true)) for (roll in 0..2) {
        val player = harvestPlayer()
        val axe = WoodcuttingAxes.withCharges(InvObj("obj.infernal_axe"), 2)
        if (worn) player.worn[3] = axe else player.inv[7] = axe
        val events = EventBus()
        val completed = mutableListOf<SkillingActionContext.Product>()
        events.subscribeUnbound(SkillingActionCompleteEvent::class.java) {
            completed += context as SkillingActionContext.Product
        }
        val access = ProtectedAccess(player, GameCoroutine(), ProtectedAccessContextFactory.empty().copy(
            getRandom = { HarvestRoll(roll) }, getEventBus = { events },
        ))
        check(with(harvest) { access.harvest(tree, logs, 25.0, axe) })
        val burns = roll == 0
        check(player.statMap.getFineXP("stat.woodcutting") == 250)
        check(player.statMap.getFineXP("stat.firemaking") == if (burns) 200 else 0)
        check(player.inv.count("obj.logs") == if (burns) 0 else 1)
        check(player.skillingProductCount("obj.logs") == if (burns) 0 else 1)
        check(completed.single().count == if (burns) 0 else 1)
        val updated = if (worn) player.worn[3]!! else player.inv[7]!!
        check(WoodcuttingAxes.charges(updated) == if (burns) 1 else 2)
    }

    for (roll in 0..4) for (kit in listOf(false, true)) {
        val player = harvestPlayer()
        val axe = InvObj("obj.rune_axe_2h")
        player.inv[7] = axe
        if (kit) {
            player.worn[1] = InvObj(ForestryRations.KIT)
            player.invMap.getOrPut(ForestryRations.STORAGE)[0] = InvObj(ForestryRations.RATION, 2)
        } else player.inv[8] = InvObj(ForestryRations.RATION, 2)
        val events = EventBus()
        val access = ProtectedAccess(player, GameCoroutine(), ProtectedAccessContextFactory.empty().copy(
            getRandom = { HarvestRoll(roll) }, getEventBus = { events },
        ))
        check(with(harvest) { access.harvest(tree, logs, 25.0, axe) })
        check(player.statMap.getFineXP("stat.woodcutting") == 275)
        check(player.inv.count("obj.logs") == if (roll == 0) 0 else 1)
        val storage = if (kit) player.invMap[ForestryRations.STORAGE]!! else player.inv
        check(storage.count(ForestryRations.RATION) == 1)
    }

    val player = harvestPlayer()
    player.inv[0] = InvObj(ForestryRations.KIT)
    player.inv[6] = InvObj(ForestryRations.RATION, 15)
    val nativeStorage = player.invMap.getOrPut(ForestryRations.STORAGE)
    // Real cache types may still say Temp. Inventory.create must make kit storage
    // persistent for both deposits and saved inventories restored on login.
    check(nativeStorage.type.scope == InvScope.Perm)
    check(nativeStorage.type.stack == dev.openrune.types.InvStackType.Always)
    check(!nativeStorage.type.protect)
    check(nativeStorage.size >= 28) { "Forestry kit inventory has no usable slots." }
    check(ForestryKitRations.depositRations(player, 6))
    check(player.inv[6] == null)
    check(player.invMap[ForestryRations.STORAGE]!!.count(ForestryRations.RATION) == 15)
    // Repeated deposits must merge into the same stored stack.
    player.inv[6] = InvObj(ForestryRations.RATION, 5)
    check(ForestryKitRations.depositRations(player, 6))
    check(player.inv[6] == null)
    check(player.invMap[ForestryRations.STORAGE]!!.count(ForestryRations.RATION) == 20)
    check(ForestryKitRations.withdrawRations(player, 8))
    check(player.inv.count(ForestryRations.RATION) == 8)
    check(ForestryRations.consume(player))
    check(player.inv.count(ForestryRations.RATION) == 7)
    check(player.invMap[ForestryRations.STORAGE]!!.count(ForestryRations.RATION) == 12)
    // Simulate account inventory reconstruction after logout/login. It must
    // remain Perm even when the packed cache has the older temporary definition.
    val restored = harvestPlayer()
    restored.inv[0] = InvObj(ForestryRations.KIT)
    val loadedStorage = restored.invMap.getOrPut(ForestryRations.STORAGE)
    loadedStorage[0] = InvObj(ForestryRations.RATION, 12)
    check(loadedStorage.type.scope == InvScope.Perm)
    check(loadedStorage.size >= 28)
    check(ForestryKitRations.withdrawRations(restored, 3))
    check(restored.inv.count(ForestryRations.RATION) == 3)
    check(loadedStorage.count(ForestryRations.RATION) == 9)
    player.inv[0] = null
    player.inv.indices.filter { player.inv[it]?.id == ForestryRations.RATION.asRSCM(RSCMType.OBJ) }
        .forEach { player.inv[it] = null }
    check(!ForestryRations.available(player))
    check(!ForestryRations.consume(player))
    check(player.invMap[ForestryRations.STORAGE]!!.count(ForestryRations.RATION) == 12)

    val full = harvestPlayer()
    val crystal = WoodcuttingAxes.withCharges(InvObj("obj.crystal_axe"), 9)
    full.inv.indices.forEach { full.inv[it] = InvObj("obj.bucket_empty") }
    full.worn[3] = crystal
    val access = ProtectedAccess(full, GameCoroutine(), ProtectedAccessContextFactory.empty().copy(
        getRandom = { HarvestRoll(1) }, getEventBus = { EventBus() },
    ))
    check(!with(harvest) { access.harvest(tree, logs, 25.0, crystal) })
    check(full.statMap.getFineXP("stat.woodcutting") == 0)
    check(WoodcuttingAxes.charges(full.worn[3]!!) == 9)
    val choosing = harvestPlayer()
    choosing.inv[0] = InvObj("obj.rune_axe")
    val felling = InvObj("obj.rune_axe_2h")
    choosing.inv[1] = felling
    choosing.inv[2] = InvObj(ForestryRations.RATION)
    check(Woodcutting.findAxe(choosing, treeType) === felling)
    println("PASS: infernal 1/3 burns and half Firemaking XP, carried/worn charges, felling 1/5 skip, kit rations and full-inventory rejection.")
}
