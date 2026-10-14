package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import org.rsmod.api.inv.storage.PlayerItemStorage
import org.rsmod.api.invtx.InvTransactionsScript
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.protect.ProtectedAccessContextFactory
import org.rsmod.api.random.GameRandom
import org.rsmod.api.registry.obj.ObjRegistry
import org.rsmod.api.registry.zone.ZoneUpdateMap
import org.rsmod.api.repo.obj.ObjRepository
import org.rsmod.api.stats.levelmod.InvisibleLevels
import org.rsmod.api.stats.xpmod.XpModifiers
import org.rsmod.coroutine.GameCoroutine
import org.rsmod.events.EventBus
import org.rsmod.game.MapClock
import org.rsmod.game.cheat.CheatCommandMap
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.loc.LocEntity
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.queue.EngineQueueCache
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.ScriptContext

private class ChopRolls : GameRandom {
    override fun of(maxExclusive: Int): Int = when {
        maxExclusive == 256 -> 255
        maxExclusive == 16 || maxExclusive == 10 -> 0 // Deplete/interrupt after this success.
        maxExclusive == 100 -> 0 // Main mushroom table.
        else -> maxExclusive - 1 // Skip fossils, bird nests and clue nests.
    }
    override fun of(minInclusive: Int, maxInclusive: Int): Int = minInclusive
    override fun randomDouble(): Double = 0.0
}

private fun treePlayer(): Player = Player().apply {
    inv = invMap.getOrPut("inv.inv")
    worn = invMap.getOrPut("inv.worn")
    statMap.setBaseLevel("stat.woodcutting", 99)
    statMap.setCurrentLevel("stat.woodcutting", 99)
    inv[0] = InvObj("obj.bronze_axe")
    currentMapClock = 10
    actionDelay = 10
    skillAnimDelay = 20
}

internal fun runSpecialTreeChopTests() {
    val clock = MapClock(10)
    val registry = ObjRegistry(ZoneUpdateMap())
    val script = SpecialTrees(clock, InvisibleLevels(emptySet()), WoodcuttingHarvest(XpModifiers(emptySet())),
        ObjRepository(clock, registry))
    with(script) { ScriptContext(EventBus(), CheatCommandMap(), EngineQueueCache()).startup() }
    with(InvTransactionsScript(PlayerItemStorage(emptySet()))) {
        ScriptContext(EventBus(), CheatCommandMap(), EngineQueueCache()).startup()
    }
    val parent = ServerCacheManager.getObject("loc.fossil_cep_multi1".asRSCM())!!
    val grown = ServerCacheManager.getObject("loc.fossil_cep_grown".asRSCM())!!
    val base = BoundLocInfo(LocInfo(2, CoordGrid(3677, 3752), LocEntity(parent.id, 10, 0)), parent)
    fun call(player: Player, tree: BoundLocInfo, type: dev.openrune.types.ObjectServerType) {
        val rolls = ChopRolls()
        val access = ProtectedAccess(player, GameCoroutine(), ProtectedAccessContextFactory.empty().copy(
            getRandom = { rolls }, getEventBus = { EventBus() },
        ))
        try { with(script) { access.chop(tree, type, initial = false) } } catch (failure: Exception) {
            error("Chop failed: XP=${player.statMap.getFineXP("stat.woodcutting")} stage=${player.sulliuscepStage} delay=${player.actionDelay}: $failure")
        }
    }
    val player = treePlayer()
    call(player, base, grown)
    check(player.inv.count("obj.bittercap_mushroom") == 1)
    check(player.statMap.getFineXP("stat.woodcutting") == 1270)
    check(player.sulliuscepStage == 1)
    check(registry.count() == 0)

    val inactive = treePlayer().apply { sulliuscepStage = 1 }
    call(inactive, base, grown)
    check(inactive.inv.count("obj.bittercap_mushroom") == 0)
    check(inactive.statMap.getFineXP("stat.woodcutting") == 0)
    check(inactive.sulliuscepStage == 1)

    val low = treePlayer().apply { statMap.setCurrentLevel("stat.woodcutting", 64) }
    call(low, base, grown)
    check(low.statMap.getFineXP("stat.woodcutting") == 0)
    check(low.sulliuscepStage == 0)
    val full = treePlayer().apply {
        inv.indices.forEach { inv[it] = InvObj("obj.bucket_empty") }
        worn[3] = InvObj("obj.bronze_axe")
    }
    call(full, base, grown)
    check(full.statMap.getFineXP("stat.woodcutting") == 0)
    check(full.sulliuscepStage == 0)

    val blister = ServerCacheManager.getObject("loc.blisterwood_tree".asRSCM())!!
    val blisterTree = BoundLocInfo(LocInfo(2, CoordGrid(3636, 3364), LocEntity(blister.id, 10, 0)), blister)
    val blisterPlayer = treePlayer()
    call(blisterPlayer, blisterTree, blister)
    check(blisterPlayer.inv.count("obj.blisterwood_logs") == 1)
    check(blisterPlayer.statMap.getFineXP("stat.woodcutting") == 760)
    check(blisterTree.id == blister.id)
    check(registry.count() == 0)
    println("Special tree chop: startup, real product/XP, personal rotation, inactive/low-level/full-inventory rejection, blisterwood interruption passed.")
}
