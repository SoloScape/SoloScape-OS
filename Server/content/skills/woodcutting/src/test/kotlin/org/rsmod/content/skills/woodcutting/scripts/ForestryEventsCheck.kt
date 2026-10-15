package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import org.rsmod.content.skills.construction.house.HouseStore
import org.rsmod.api.player.interact.LocInteractions
import org.rsmod.api.player.events.interact.NpcEvents
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.protect.ProtectedAccessContextFactory
import org.rsmod.api.registry.controller.ControllerRegistry
import org.rsmod.api.registry.loc.LocRegistry
import org.rsmod.api.registry.loc.LocRegistryNormal
import org.rsmod.api.registry.loc.LocRegistryRegion
import org.rsmod.api.registry.npc.NpcRegistry
import org.rsmod.api.registry.obj.ObjRegistry
import org.rsmod.api.registry.player.PlayerRegistry
import org.rsmod.api.registry.region.RegionRegistry
import org.rsmod.api.registry.zone.ZonePlayerActivityBitSet
import org.rsmod.api.registry.zone.ZoneUpdateMap
import org.rsmod.api.repo.loc.LocRepository
import org.rsmod.api.repo.npc.NpcRepository
import org.rsmod.api.repo.obj.ObjRepository
import org.rsmod.api.repo.player.PlayerRepository
import org.rsmod.api.route.BoundValidator
import org.rsmod.api.stats.xpmod.XpModifiers
import org.rsmod.coroutine.GameCoroutine
import org.rsmod.events.EventBus
import org.rsmod.game.MapClock
import org.rsmod.game.cheat.CheatCommandMap
import org.rsmod.game.entity.ControllerList
import org.rsmod.game.entity.Npc
import org.rsmod.game.entity.NpcList
import org.rsmod.game.entity.Player
import org.rsmod.game.entity.PlayerList
import org.rsmod.game.entity.npc.NoopNpcInfo
import org.rsmod.game.entity.npc.NpcInfoProtocol
import org.rsmod.game.entity.npc.NpcStateEvents
import org.rsmod.game.inv.InvObj
import org.rsmod.game.interact.InteractionLocOp
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.map.LocZoneStorage
import org.rsmod.game.queue.EngineQueueCache
import org.rsmod.game.region.RegionListLarge
import org.rsmod.game.region.RegionListSmall
import org.rsmod.game.region.RegionListWorldEntity
import org.rsmod.map.CoordGrid
import org.rsmod.map.zone.ZoneKey
import org.rsmod.plugin.scripts.ScriptContext
import org.rsmod.routefinder.collision.CollisionFlagMap
import org.rsmod.routefinder.flag.CollisionFlag

private class ForestryFixture {
    val origin = CoordGrid(3200, 3200)
    val clock = MapClock(100)
    val flags = CollisionFlagMap()
    val bus = EventBus()
    val requests = mutableMapOf<Npc, String>()
    val npcList = NpcList()
    private val updates = ZoneUpdateMap()
    private val zones = LocZoneStorage()
    private val activity = ZonePlayerActivityBitSet()
    private val npcRegistry = NpcRegistry(npcList, flags, bus)
    private val playerRegistry = PlayerRegistry(PlayerList(), flags, activity, bus)
    private val normal = LocRegistryNormal(updates, flags, zones)
    private val regions = RegionRegistry(RegionListSmall(), RegionListLarge(),
        RegionListWorldEntity(), normal, flags, zones, npcRegistry,
        ControllerRegistry(clock, ControllerList()), activity)
    private val registry = LocRegistry(zones, normal,
        LocRegistryRegion(updates, flags, zones, regions))
    val locs = LocRepository(clock, registry, regions)
    val npcs = NpcRepository(clock, npcRegistry, npcList)
    val houseStore = HouseStore()
    val manager = ForestryEventManager(clock, PlayerRepository(playerRegistry), locs, npcs,
        ObjRepository(clock, ObjRegistry(updates)), XpModifiers(emptySet()), houseStore, flags)
    val player = Player().apply {
        members = true
        coords = origin
        inv = invMap.getOrPut("inv.inv")
        worn = invMap.getOrPut("inv.worn")
        inv[0] = InvObj("obj.rune_axe")
        inv[1] = InvObj(ForestryRations.KIT)
        houseStore.update(this) { it.createStarterHouse() }
        for (skill in listOf("woodcutting", "fletching", "farming", "construction", "hunter", "thieving")) {
            statMap.setBaseLevel("stat.$skill", 99)
            statMap.setCurrentLevel("stat.$skill", 99)
        }
        slotId = checkNotNull(playerRegistry.nextFreeSlot())
        uuid = slotId.toLong()
        observerUUID = 1L
        playerRegistry.add(this)
        playerRegistry.change(this, ZoneKey.NULL, ZoneKey.from(coords))
    }
    val access = ProtectedAccess(player, GameCoroutine(),
        ProtectedAccessContextFactory.empty().copy(getEventBus = { bus },
            getLocInteractions = { LocInteractions(BoundValidator(flags), bus) }))

    init {
        for (x in 3184..3224 step 8) for (z in 3184..3224 step 8)
            flags.allocateIfAbsent(x, z, 0)
        bus.subscribeUnbound(NpcStateEvents.Create::class.java) {
            val created = npc
            created.infoProtocol = object : NpcInfoProtocol by NoopNpcInfo {
                override fun setSay(text: String) { requests[created] = text }
                override fun isActive() = true
            }
        }
        with(ForestryEventScript(manager)) {
            ScriptContext(bus, CheatCommandMap(), EngineQueueCache()).startup()
        }
        check(bus.contains(NpcEvents.Op4::class.java, ForestryAssets.ENTLING.asRSCM()))
        check(bus.contains(NpcEvents.Op5::class.java, ForestryAssets.ENTLING.asRSCM()))
    }

    fun spawn(type: ForestryEventType) {
        check(manager.debugSpawn(player, type) == null) { "Could not spawn $type" }
    }
    fun ticks(count: Int) = repeat(count) { clock.tick(); manager.tick() }
    fun locations(): List<LocInfo> = (-2..2).flatMap { x -> (-2..2).flatMap { z ->
        locs.findAll(ZoneKey.from(origin).translate(x, z)).toList()
    } }
    fun loc(symbol: String) = locations().first { it.id == symbol.asRSCM() }
    fun npc(symbol: String) = npcList.first { it.type.internalName == symbol }
    fun operate(loc: LocInfo) {
        val type = checkNotNull(ServerCacheManager.getObject(loc.id))
        with(manager) { access.interactLoc(BoundLocInfo(loc, type)) }
    }
    fun operate(npc: Npc, option: Int) {
        with(manager) { access.interactNpc(npc, option) }
    }
    fun addPlayer(): Pair<Player, ProtectedAccess> {
        val guest = Player().apply {
            members = true
            coords = origin
            inv = invMap.getOrPut("inv.inv")
            worn = invMap.getOrPut("inv.worn")
            for (skill in listOf("woodcutting", "construction")) {
                statMap.setBaseLevel("stat.$skill", 50)
                statMap.setCurrentLevel("stat.$skill", 50)
            }
            slotId = checkNotNull(playerRegistry.nextFreeSlot())
            uuid = slotId.toLong()
            observerUUID = uuid
            playerRegistry.add(this)
            playerRegistry.change(this, ZoneKey.NULL, ZoneKey.from(coords))
        }
        return guest to ProtectedAccess(guest, GameCoroutine(),
            ProtectedAccessContextFactory.empty().copy(getEventBus = { bus },
                getLocInteractions = { LocInteractions(BoundValidator(flags), bus) }))
    }
    fun operate(npc: Npc, guest: ProtectedAccess, option: Int) {
        with(manager) { guest.interactNpc(npc, option) }
    }
    fun move(to: CoordGrid) {
        val from = player.coords
        player.coords = to
        playerRegistry.change(player, ZoneKey.from(from), ZoneKey.from(to))
    }
}

fun main() {
    ServerCacheManager.init(240).close()
    for (symbol in ForestryAssets.locNames) checkNotNull(ForestryAssets.loc(symbol))
    for (symbol in ForestryAssets.npcNames) checkNotNull(ForestryAssets.npc(symbol))
    for (symbol in ForestryAssets.mulch + ForestryAssets.EGG)
        checkNotNull(ServerCacheManager.getItem(symbol.asRSCM()))
    check(ForestryAssets.loc(ForestryAssets.SAPLING)!!.width == 1)
    checkNotNull(ServerCacheManager.getAnim(ForestryHiveRules.BUILD_ANIMATION.asRSCM())) {
        "The native Construction building animation must exist in this cache"
    }
    println("Forestry basket cache items: " + ServerCacheManager.getItems().values
        .filter { it.name.contains("Log basket", true) ||
            it.name.contains("Forestry basket", true) }
        .map { it.internalName + " [" + it.id + "] " + it.actions.toString() })
    check(ForestryAssets.npc(ForestryAssets.HIVE)!!.name.contains("<col="))
    check(ForestryAssets.npc(ForestryAssets.TRAP)!!.name.contains("<col="))

    run {
        val f = ForestryFixture()
        for (x in 3194..3206) for (z in 3194..3206) {
            if (x != 3200 || z != 3200) f.flags[x, z, 0] = CollisionFlag.BLOCK_WALK
        }
        check(f.manager.debugSpawn(f.player, ForestryEventType.SAPLING)?.contains("reachable") == true)
        check(f.locations().isEmpty() && f.npcList.none())
        val placement = ForestryPlacement(f.flags)
        check(!placement.clear(CoordGrid(3206, 3206), 2, 2))
        check(!placement.clear(CoordGrid(3300, 3300), 1, 1))
    }

    for (type in ForestryEventType.entries) {
        val f = ForestryFixture()
        f.flags[f.origin.x - 3, f.origin.z, 0] = CollisionFlag.BLOCK_WALK
        f.spawn(type)
        check(f.manager.debugSpawn(f.player, type)?.contains("already active") == true)
        val placement = ForestryPlacement(f.flags)
        val entities = f.locations().map { it.coords } + f.npcList.map { it.coords }
        check(entities.isNotEmpty())
        check(entities.none { it == f.origin.translate(-3, 0) || it == f.origin })
        for (npc in f.npcList) {
            if (npc.type.internalName in ForestryAssets.circles)
                check(placement.reachable(f.origin, npc.coords))
        }
        f.ticks(type.ticks)
        check(f.locations().isEmpty()) { "$type left scenery behind" }
        check(f.npcList.none()) { "$type left NPCs behind" }
    }

    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.ROOTS)
        val root = f.loc(ForestryAssets.ROOT)
        f.operate(root)
        val firstXp = f.player.statMap.getFineXP("stat.woodcutting")
        check(firstXp > 0 && f.player.interaction != null)
        f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") == firstXp)
        f.ticks(4); f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") > firstXp)
        f.ticks(26)
        val infused = f.loc(ForestryAssets.INFUSED_ROOT)
        check(f.locations().count { it.id == infused.id } == 1)
        val before = f.player.statMap.getFineXP("stat.woodcutting")
        f.operate(infused)
        check(f.player.statMap.getFineXP("stat.woodcutting") - before > firstXp)
        f.ticks(17)
        check(f.loc(ForestryAssets.INFUSED_ROOT).coords == infused.coords)
        f.ticks(1)
        check(f.loc(ForestryAssets.INFUSED_ROOT).coords != infused.coords)
        check((f.player.interaction as InteractionLocOp).target.id == ForestryAssets.ROOT.asRSCM())
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.SAPLING)
        repeat(3) { i ->
            f.operate(f.loc(ForestryAssets.ingredients[i]))
            check(f.player.inv.count(ForestryAssets.mulch[i]) == 1)
            if (i > 0) check(f.player.inv.count(ForestryAssets.mulch[i - 1]) == 0)
            f.ticks(4)
        }
        f.operate(f.loc(ForestryAssets.SAPLING))
        check(f.player.inv.count(ForestryAssets.mulch.last()) == 0)
        val xp = f.player.statMap.getFineXP("stat.woodcutting")
        check(xp > 0)
        f.ticks(4); f.operate(f.loc(ForestryAssets.SAPLING))
        check(f.player.statMap.getFineXP("stat.woodcutting") == xp)
        f.operate(f.loc(ForestryAssets.ingredients.first()))
        f.manager.onLogout(f.player)
        check(ForestryAssets.mulch.none { f.player.inv.count(it) > 0 })
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.ENT)
        check(f.requests.values.count { it in ForestryRules.entRequests } == 5)
        f.ticks(10)
        check(f.npcList.any { it.routeDestination.isNotEmpty() })
        for (ent in f.npcList.toList()) {
            val style = ForestryRules.entRequests.indexOf(f.requests.getValue(ent))
            for (op in ForestryRules.entOptions[style]) {
                f.operate(ent, op); f.ticks(4)
            }
        }
        check(f.player.statMap.getFineXP("stat.fletching") > 0)
        check(f.npcList.none())
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.FLOWERS)
        check(f.npcList.count { it.type.internalName in ForestryAssets.bushes } == 8)
        for (bush in f.npcList.toList()) {
            f.operate(bush, 1); f.ticks(4)
        }
        check(f.player.statMap.getFineXP("stat.woodcutting") > 0)
        f.manager.shutdown()
        check(f.npcList.none() && f.locations().isEmpty())
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.LEPRECHAUN)
        f.move(f.loc(ForestryAssets.RAINBOW).coords)
        f.ticks(1)
        check(ForestryLeprechaunLuck.units(f.player) == 12)
        f.ticks(1)
        check(ForestryLeprechaunLuck.units(f.player) == 12)
        f.ticks(20)
        check(f.locations().count { it.id == ForestryAssets.RAINBOW.asRSCM() } == 1)
        val oak = checkNotNull(ServerCacheManager.getObject("loc.oaktree".asRSCM()))
        val before = f.player.statMap.getFineXP("stat.woodcutting")
        f.manager.onChop(f.player, f.origin, oak, fallen = false, harvested = true)
        check(ForestryLeprechaunLuck.units(f.player) == 7)
        check(f.player.statMap.getFineXP("stat.woodcutting") > before)
        val bark = f.player.inv.count("obj.forestry_currency") +
            (f.player.invMap[ForestryRations.STORAGE]?.count("obj.forestry_currency") ?: 0)
        check(bark in 22..23)
    }
    run {
        val f = ForestryFixture()
        // Use the real stage IDs, not an arbitrary NPC named "Beehive".
        check(ForestryAssets.npc(ForestryAssets.HIVE)?.id == 12515)
        check(ForestryAssets.hiveHalf()?.id == 12516)
        check(ForestryAssets.hiveComplete()?.id == 12517)
        f.spawn(ForestryEventType.HIVE)
        val partsSymbol = ServerCacheManager.getItems().values.first {
            it.name.equals("Sturdy beehive parts", ignoreCase = true)
        }.internalName
        var completed = 0
        var previousParts = 0
        repeat(ForestryHiveRules.HIVES) { round ->
            val hive = f.npc(ForestryAssets.HIVE)
            check(hive.visType.id == 12515)
            repeat(ForestryHiveRules.logsPerHive(1)) { index ->
                f.player.inv[2] = InvObj("obj.logs")
                f.operate(hive, 1)
                check(f.player.inv.count("obj.logs") == 0)
                check(hive.visType.id == when {
                    index + 1 == ForestryHiveRules.logsPerHive(1) -> 12517
                    ForestryHiveRules.halfway(index + 1,
                        ForestryHiveRules.logsPerHive(1)) -> 12516
                    else -> 12515
                })
                if (index + 1 < ForestryHiveRules.logsPerHive(1)) {
                    check(f.player.inv.count(partsSymbol) == previousParts)
                }
                f.ticks(2)
            }
            completed++
            val parts = f.player.inv.count(partsSymbol)
            check(parts in previousParts..(previousParts + 1))
            previousParts = parts
            if (round < ForestryHiveRules.HIVES - 1) {
                f.ticks(ForestryHiveRules.RESPAWN_TICKS)
                check(f.npc(ForestryAssets.HIVE) !== hive)
            } else {
                f.ticks(ForestryHiveRules.RESPAWN_TICKS + 1)
                check(f.npcList.none())
            }
        }
        check(completed == 6)
        check(f.player.statMap.getFineXP("stat.construction") ==
            (ForestryHiveRules.constructionXp(99, "obj.logs") * 30 * 10).toInt())
        check(f.player.statMap.getFineXP("stat.woodcutting") > 0)
    }
    run {
        val f = ForestryFixture()
        // The log requirement is frozen at spawn. Spectators do not increase it.
        f.addPlayer()
        f.spawn(ForestryEventType.HIVE)
        val hive = f.npc(ForestryAssets.HIVE)
        repeat(5) {
            f.player.inv[2] = InvObj("obj.logs")
            f.operate(hive, 1)
            f.ticks(2)
        }
        check(hive.visType.id == 12516 && f.npcList.any { it === hive })
        repeat(5) {
            f.player.inv[2] = InvObj("obj.logs")
            f.operate(hive, 1)
            f.ticks(2)
        }
        check(hive.visType.id == 12517)
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.HIVE)
        val (late, lateAccess) = f.addPlayer()
        val hive = f.npc(ForestryAssets.HIVE)
        val partsSymbol = ServerCacheManager.getItems().values.first {
            it.name.equals("Sturdy beehive parts", ignoreCase = true)
        }.internalName
        late.inv[0] = InvObj("obj.logs")
        f.operate(hive, lateAccess, 1)
        check(late.inv.count("obj.logs") == 0)
        check(late.statMap.getFineXP("stat.woodcutting") == 10)
        check(late.statMap.getFineXP("stat.construction") == 0)
        repeat(4) {
            f.player.inv[2] = InvObj("obj.logs")
            f.operate(hive, 1)
            f.ticks(2)
        }
        check(late.inv.count(partsSymbol) == 0)
        check(late.inv.count("obj.forestry_currency") == 0)
    }
    run {
        // No player-owned house: build and contribute, but no Construction XP.
        val f = ForestryFixture()
        f.houseStore.update(f.player) { it.owned = false }
        f.spawn(ForestryEventType.HIVE)
        f.player.inv[2] = InvObj("obj.magic_logs")
        f.operate(f.npc(ForestryAssets.HIVE), 1)
        check(f.player.inv.count("obj.magic_logs") == 0)
        check(f.player.statMap.getFineXP("stat.construction") == 0)
        check(f.player.statMap.getFineXP("stat.woodcutting") > 0)
    }
    run {
        // Partial work times out without granting a 2/3 sturdy-parts roll.
        val f = ForestryFixture()
        f.spawn(ForestryEventType.HIVE)
        val partsSymbol = ServerCacheManager.getItems().values.first {
            it.name.equals("Sturdy beehive parts", ignoreCase = true)
        }.internalName
        f.player.inv[2] = InvObj("obj.logs")
        check(ForestryHiveSupplies.availableLogs(f.player) == 1)
        f.operate(f.npc(ForestryAssets.HIVE), 1)
        check(ForestryHiveSupplies.availableLogs(f.player) == 0)
        f.ticks(ForestryEventType.HIVE.ticks)
        check(f.player.inv.count(partsSymbol) == 0)
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.FOX)
        f.operate(f.npc(ForestryAssets.TRAP), 1)
        check(f.npcList.none { it.type.internalName == ForestryAssets.TRAP })
        check(f.player.statMap.getFineXP("stat.hunter") > 0)
        f.ticks(12)
        check(f.npcList.any { it.type.internalName == ForestryAssets.TRAP })
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.RITUAL)
        val circles = f.npcList.filter { it.type.internalName in ForestryAssets.circles }
        val codes = circles.map { ForestryAssets.circles.indexOf(it.type.internalName) }
        val answer = ForestryRules.validCircle(codes.map { it % 4 to it / 4 })
        val dryad = f.npc(ForestryAssets.DRYAD)
        check(dryad.hitpoints in 1 until dryad.baseHitpointsLvl)
        f.move(circles[answer].coords); f.ticks(1)
        val xp = f.player.statMap.getFineXP("stat.woodcutting")
        check(xp == (ForestryRules.ritualXp(99) * 10).toInt())
        check(dryad.hitpoints == 16)
        f.ticks(1)
        check(f.player.statMap.getFineXP("stat.woodcutting") == xp)
        check(dryad.hitpoints == 16)
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.PHEASANT)
        val empty = f.loc(ForestryAssets.EMPTY_NEST)
        val guarded = f.loc(ForestryAssets.NEST)
        check(f.npcList.count { it.type.internalName == ForestryAssets.PHEASANT } == 3)
        f.operate(guarded)
        check(f.player.inv.count(ForestryAssets.EGG) == 0)
        f.ticks(4); f.operate(empty)
        check(f.player.inv.count(ForestryAssets.EGG) == 1)
        f.ticks(2); f.operate(f.npc(ForestryAssets.FORESTER), 1)
        check(f.player.inv.count(ForestryAssets.EGG) == 0)
        val xp = f.player.statMap.getFineXP("stat.woodcutting")
        check(xp > 0 && f.player.inv.count("obj.forestry_pheasant_feathers") == 1)
        f.ticks(4); f.operate(empty)
        check(f.player.inv.count(ForestryAssets.EGG) == 1)
        f.move(empty.coords); f.ticks(2)
        check(f.player.inv.count(ForestryAssets.EGG) == 0)
        check(f.loc(ForestryAssets.EMPTY_NEST).coords != empty.coords)
        f.move(f.origin); f.ticks(84)
        check(f.player.statMap.getFineXP("stat.woodcutting") == xp)
    }
    println("PASS: all nine native spawns and cleanup; reachable placement, roots, visible mulch/egg inventory, ent menus/movement, rainbow bonus, hive/fox actions, ritual healing and pheasant rotation/stuns.")
}
