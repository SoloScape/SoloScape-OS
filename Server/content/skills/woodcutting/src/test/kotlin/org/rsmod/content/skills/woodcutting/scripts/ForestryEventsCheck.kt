package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import org.rsmod.content.skills.construction.house.HouseStore
import org.rsmod.api.server.config.ServerConfig
import org.rsmod.api.player.interact.LocInteractions
import org.rsmod.api.player.events.interact.NpcEvents
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.protect.ProtectedAccessContextFactory
import org.rsmod.api.player.vars.intVarp
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
import org.rsmod.game.headbar.Headbar
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

private var Player.testLastCombat: Int by intVarp("varp.lastcombat")

private class ForestryFixture(private val memberWorld: Boolean = true) {
    val origin = CoordGrid(3200, 3200)
    val clock = MapClock(100)
    val flags = CollisionFlagMap()
    val bus = EventBus()
    val requests = mutableMapOf<Npc, String>()
    val headbars = mutableMapOf<Npc, MutableList<Headbar>>()
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
    val serverConfig = ServerConfig("Forestry test", 0, 240, "test", 1,
        membersWorld = memberWorld)
    val manager = ForestryEventManager(clock, PlayerRepository(playerRegistry), locs, npcs,
        ObjRepository(clock, ObjRegistry(updates)), XpModifiers(emptySet()),
        houseStore, serverConfig, flags)
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
                override fun showHeadbar(headbar: Headbar) {
                    headbars.getOrPut(created) { mutableListOf() }.add(headbar)
                }
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
        operate(loc, access)
    }
    fun operate(loc: LocInfo, user: ProtectedAccess) {
        val type = checkNotNull(ServerCacheManager.getObject(loc.id))
        with(manager) { user.interactLoc(BoundLocInfo(loc, type)) }
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
    checkNotNull(ServerCacheManager.getInterface("interface.skillmulti".asRSCM())) {
        "The original Make-X item/quantity interface must exist in this cache"
    }
    checkNotNull(ServerCacheManager.getItem(ForestryAssets.hiveMenuItem().asRSCM())) {
        "The native Beehive SkillMulti item graphic must exist in this cache"
    }
    println("Beehive SkillMulti icon: " + ForestryAssets.hiveMenuItem())
    // Sailing hardwoods may be absent from older cache revisions. Report actual
    // definitions instead of pretending that a rule-list string creates an item.
    val sailingLogs = listOf(
        "Jatoba logs", "Camphor logs", "Ironwood logs", "Rosewood logs"
    )
    val knownItems = ServerCacheManager.getItems().values
    for (name in sailingLogs) {
        val definition = knownItems.firstOrNull { it.name.equals(name, ignoreCase = true) }
        println("Beehive log cache: $name -> " +
            (definition?.internalName ?: "unavailable in this cache"))
        if (definition != null) {
            check(definition.internalName in ForestryRules.logs) {
                "Wiki-supported $name uses ${definition.internalName}, but ForestryRules.logs omits it"
            }
        }
    }
    println("Bank Deposit Containers mapping: " + runCatching {
        "component.bankmain:depositcontainers".asRSCM(RSCMType.COMPONENT)
    }.getOrNull())
    println("Forestry basket cache items: " + ServerCacheManager.getItems().values
        .filter { it.name.contains("Log basket", true) ||
            it.name.contains("Forestry basket", true) }
        .map { it.internalName + " [" + it.id + "]" })
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

    run {
        val f = ForestryFixture(memberWorld = false)
        check(f.manager.debugSpawn(f.player, ForestryEventType.HIVE)?.contains("members") == true)
        check(f.npcList.none() && f.locations().isEmpty())
        f.spawn(ForestryEventType.ROOTS)
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
        check(f.locations().count { it.id == ForestryAssets.ROOT.asRSCM() } == 6)
        f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") == 0)
        check(f.player.actionDelay == f.clock.cycle + 3)
        f.ticks(2)
        f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") == 0)
        f.ticks(1)
        f.operate(root)
        val firstXp = f.player.statMap.getFineXP("stat.woodcutting")
        check(firstXp == (ForestryRules.rootXp(99, false) * 10).toInt())
        f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") == firstXp) {
            "A root cannot double-roll within one game tick"
        }
        f.ticks(1)
        f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") == firstXp)
        f.ticks(3)
        f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") > firstXp)
        var firstDelay = 7
        while (f.locations().none { it.id == ForestryAssets.INFUSED_ROOT.asRSCM() }) {
            f.ticks(1)
            firstDelay++
            check(firstDelay <= 35)
        }
        check(firstDelay in 25..35)
        val infused = f.loc(ForestryAssets.INFUSED_ROOT)
        val before = f.player.statMap.getFineXP("stat.woodcutting")
        f.operate(infused)
        check(f.player.statMap.getFineXP("stat.woodcutting") == before)
        f.ticks(3)
        f.operate(infused)
        check(f.player.statMap.getFineXP("stat.woodcutting") - before ==
            (ForestryRules.rootXp(99, true) * 10).toInt())
        f.ticks(16)
        check(f.loc(ForestryAssets.INFUSED_ROOT).coords == infused.coords)
        f.ticks(1)
        check(f.loc(ForestryAssets.INFUSED_ROOT).coords != infused.coords)
        check((f.player.interaction as InteractionLocOp).target.id ==
            ForestryAssets.ROOT.asRSCM())
        check(f.locations().count { it.id == ForestryAssets.ROOT.asRSCM() ||
            it.id == ForestryAssets.INFUSED_ROOT.asRSCM() } == 6)
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.ROOTS)
        val root = f.loc(ForestryAssets.ROOT)
        f.player.testLastCombat = f.clock.cycle
        f.operate(root)
        check(f.player.actionDelay == f.clock.cycle + 3) {
            "A combat timestamp must not accelerate root rolls"
        }
        f.ticks(2)
        f.player.testLastCombat = f.clock.cycle
        f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") == 0)
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.ROOTS)
        val root = f.loc(ForestryAssets.ROOT)
        f.operate(root)
        f.ticks(3)
        f.operate(root)
        val xp = f.player.statMap.getFineXP("stat.woodcutting")
        check(xp > 0)
        // Simulate cancelling the interaction before the combat engine's
        // legitimate one-tick flinch (Rapid weapon and Auto Retaliate enabled).
        // Merely changing lastcombat must not produce this faster roll.
        f.player.clearInteraction()
        f.ticks(1)
        f.player.actionDelay = f.clock.cycle + 1
        f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") == xp)
        f.ticks(1)
        f.operate(root)
        val twoTickXp = f.player.statMap.getFineXP("stat.woodcutting")
        check(twoTickXp > xp) {
            "A genuine one-tick flinch should allow a root roll two ticks later"
        }
        f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") == twoTickXp) {
            "Two-tick root chopping must not double-roll"
        }
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.ROOTS)
        val (late, access) = f.addPlayer()
        late.inv[0] = InvObj("obj.rune_axe")
        val root = f.loc(ForestryAssets.ROOT)
        f.operate(root, access)
        f.ticks(3)
        f.operate(root, access)
        check(late.inv.count("obj.forestry_currency") == 1)
        check(late.statMap.getFineXP("stat.woodcutting") == 10)
    }
    run {
        val f = ForestryFixture()
        f.player.inv[0] = InvObj("obj.rune_axe_2h")
        f.player.inv[2] = InvObj(ForestryRations.RATION, 3)
        f.spawn(ForestryEventType.ROOTS)
        val root = f.loc(ForestryAssets.ROOT)
        f.operate(root)
        f.ticks(3)
        f.operate(root)
        check(f.player.statMap.getFineXP("stat.woodcutting") in 598..600)
        check(f.player.inv.count(ForestryRations.RATION) == 2)
    }
    run {
        val f = ForestryFixture()
        f.player.statMap.setBaseLevel("stat.woodcutting", 14)
        f.player.statMap.setCurrentLevel("stat.woodcutting", 14)
        f.spawn(ForestryEventType.ROOTS)
        f.operate(f.loc(ForestryAssets.ROOT))
        check(f.player.statMap.getFineXP("stat.woodcutting") == 0)
        check(f.player.inv.count("obj.forestry_currency") == 0)
    }
    run {
        val f = ForestryFixture()
        f.spawn(ForestryEventType.ROOTS)
        f.ticks(35)
        // Run the regular automatic interaction every tick, including the
        // idle ticks between the 4-tick rolls.
        repeat(120) {
            f.operate(f.loc(ForestryAssets.INFUSED_ROOT))
            f.ticks(1)
        }
        val bark = f.player.inv.count("obj.forestry_currency") +
            (f.player.invMap[ForestryRations.STORAGE]?.count("obj.forestry_currency") ?: 0)
        check(bark > 256) { "Rising Roots must not use the generic 256-bark event cap" }
        val xp = f.player.statMap.getFineXP("stat.woodcutting")
        f.ticks(ForestryEventType.ROOTS.ticks)
        check(f.player.statMap.getFineXP("stat.woodcutting") == xp) {
            "Rising Roots must not award generic completion XP"
        }
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
        f.spawn(ForestryEventType.HIVE)
        val friendly = ForestryAssets.friendlyBees()
        if (friendly != null) {
            val bees = f.npcList.filter { it.type.id == friendly.id }
            check(bees.size == 3)
            f.ticks(8)
            check(bees.any { it.routeDestination.isNotEmpty() }) {
                "Friendly bees should wander during the beehive event"
            }
            check(f.npc(ForestryAssets.KEEPER).routeDestination.isEmpty())
            check(f.npc(ForestryAssets.HIVE).routeDestination.isEmpty())
        }
        f.manager.shutdown()
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
            check(f.headbars[hive]?.lastOrNull()?.endFill == 0) {
                "A fresh hive should show an empty green bar on red"
            }
            repeat(ForestryHiveRules.logsPerHive(1)) { index ->
                f.player.inv[2] = InvObj("obj.logs")
                f.operate(hive, 1)
                check(f.player.inv.count("obj.logs") == 0)
                val headbar = checkNotNull(f.headbars[hive]?.lastOrNull())
                check(headbar.self == ForestryHiveRules.PROGRESS_HEADBAR_ID)
                check(headbar.public == ForestryHiveRules.PROGRESS_HEADBAR_ID)
                check(headbar.startFill == ForestryHiveRules.progressFill(
                    index + 1, ForestryHiveRules.logsPerHive(1)))
                check(headbar.endFill == headbar.startFill)
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
    println("PASS: all nine native spawns and cleanup; reachable placement, roots, visible mulch/egg inventory, ent menus/movement, rainbow bonus, hive/fox actions, roaming bees, ritual healing and pheasant rotation/stuns.")
}
