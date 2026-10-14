package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.types.InvScope
import dev.openrune.types.NpcMode
import dev.openrune.types.ObjectServerType
import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlin.random.Random
import org.rsmod.api.game.process.GameLifecycle
import org.rsmod.api.invtx.invTransfer
import org.rsmod.api.player.ironman.IronmanRestrictions
import org.rsmod.api.player.output.mes
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.stat.statAdvance
import org.rsmod.api.player.stat.woodcuttingLvl
import org.rsmod.api.repo.loc.LocRepository
import org.rsmod.api.repo.npc.NpcRepository
import org.rsmod.api.repo.obj.ObjRepository
import org.rsmod.api.repo.player.PlayerRepository
import org.rsmod.api.stats.xpmod.XpModifiers
import org.rsmod.api.npc.heal
import org.rsmod.api.script.onCommand
import org.rsmod.api.script.onEvent
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpNpc1
import org.rsmod.api.script.onOpNpc2
import org.rsmod.api.script.onOpNpc3
import org.rsmod.api.script.onOpNpc4
import org.rsmod.api.script.onOpNpc5
import org.rsmod.game.MapClock
import org.rsmod.content.skills.woodcutting.scripts.Woodcutting.Companion.treeLevelReq
import org.rsmod.content.skills.woodcutting.scripts.Woodcutting.Companion.treeXp
import org.rsmod.content.skills.woodcutting.scripts.Woodcutting.Companion.axeWoodcuttingAnim
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCMType
import org.rsmod.game.entity.Npc
import org.rsmod.game.entity.Player
import org.rsmod.game.entity.player.SessionStateEvent
import org.rsmod.game.inv.InvObj
import org.rsmod.game.interact.InteractionLocOp
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.loc.LocAngle
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.loc.LocShape
import org.rsmod.game.type.getInvObj
import org.rsmod.map.CoordGrid
import org.rsmod.map.zone.ZoneKey
import org.rsmod.routefinder.collision.CollisionFlagMap
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

/**
 * Forestry activity is world-shared, not an independent roll per player.
 * Everything here is short-lived. Only earned XP/items are persistent.
 *
 * Native assets use gameval symbols; display names include tags and unrelated variants.
 */
@Singleton
class ForestryEventManager @Inject constructor(
    private val clock: MapClock,
    private val players: PlayerRepository,
    private val locs: LocRepository,
    private val npcs: NpcRepository,
    private val objects: ObjRepository,
    private val xpMods: XpModifiers,
    flags: CollisionFlagMap,
) {
    private val placement = ForestryPlacement(flags)
    private data class TreeRoll(
        val origin: CoordGrid,
        val type: ForestryEventType,
        val level: Int,
        val fireAt: Int,
        var lastChopped: Int,
    )
    private class Event(
        val type: ForestryEventType,
        val origin: CoordGrid,
        val start: Int,
        val finish: Int,
        val eligibleAtStart: Set<Player>,
        val accessFrom: CoordGrid,
    ) {
        val locs = mutableMapOf<LocInfo, String>()
        val npcs = mutableMapOf<Npc, String>()
        val contributions = mutableMapOf<Player, ForestryContribution>()
        val excluded = mutableSetOf<Player>()
        val recipe = List(3) { Random.nextInt(5) }
        val entStyles = List(5) { Random.nextInt(4) }
        val entPrunes = List(5) { mutableSetOf<Int>() }
        val circles = mutableListOf<Pair<Int, Int>>()
        var circleAnswer = 0
        var partnerA = Random.nextInt(8)
        var partnerB = (partnerA + Random.nextInt(1, 8)) % 8
        var phase = 0
        var lastPhase = start
        var growth = 0
        var completed = false
        var foxHits = 0
        var trapActive = false
        var hiveProgress = 0
        var emptyNest = Random.nextInt(4)
        var infusedRoot = -1
        var rootPhase = -1
        var ritualHealed = false
        var rainbowsSpawned = 0
        var nextRainbow = start
        var rainbowWarning = false
        val rainbowTouched = mutableMapOf<Player, MutableSet<Int>>()
    }

    private val history = java.util.WeakHashMap<Player, ForestryHistory>()
    private val scheduled = mutableMapOf<CoordGrid, TreeRoll>()
    private val active = mutableListOf<Event>()
    private val cooldowns = mutableMapOf<CoordGrid, Int>()

    /** Called on every actual 4-tick skilling roll, even when no log is awarded. */
    fun onChop(player: Player, tree: CoordGrid, type: ObjectServerType, fallen: Boolean, harvested: Boolean) {
        val cycle = clock.cycle
        history.getOrPut(player) { ForestryHistory() }.record(tree, cycle)
        // Luck is earned by walking under rainbows but paid out on subsequent successful chops.
        // It is independent of the event's lifetime and does not require another event to be active.
        if (ForestryLeprechaunLuck.consume(player, harvested, type.treeLevelReq)) {
            player.statAdvance("stat.woodcutting",
                ForestryLeprechaunLuck.bonusXp(type.treeXp, type.treeLevelReq, player.woodcuttingLvl) *
                    xpMods.get(player, "stat.woodcutting"))
            give(player, "obj.forestry_currency", ForestryLeprechaunLuck.bark())
            if (ForestryLeprechaunLuck.units(player) < ForestryLeprechaunLuck.UNITS_PER_CHOP)
                player.mes("You use the last of your leprechaun's luck to gather some Anima-infused bark.")
        }
        for (event in active) {
            if (!forestryNear(tree, event.origin, 30) && player !in event.contributions) {
                event.excluded.add(player)
            }
        }
        if (!canSpawnAt(type, tree)) return
        if (scheduled.containsKey(tree)) {
            val current = scheduled.getValue(tree)
            current.lastChopped = cycle
            if (fallen) attemptSpawn(tree)
            return
        }
        if (!ForestryRations.hasKit(player)) return
        val choices = ForestryEventType.entries.toList()
        val selected = choices[Random.nextInt(choices.size)]
        scheduled[tree] = TreeRoll(tree, selected, type.treeLevelReq, cycle + Random.nextInt(67, 201), cycle)
        if (fallen) attemptSpawn(tree)
    }

    private fun canSpawnAt(type: ObjectServerType, tree: CoordGrid): Boolean {
        val name = type.internalName.lowercase()
        if (name in SpecialTreeDefinitions.naturalNames ||
            name in SpecialTreeDefinitions.farmedNames ||
            name.contains("blisterwood") || name.contains("hollow") ||
            name.contains("redwood") || name.contains("burnt") ||
            name.contains("fossil_cep") || name.contains("dead_tree")
        ) return false
        if (type.name.equals("Tree", ignoreCase = true)) return false
        // Woodcutting Guild: invisible skill boost, but no Forestry events.
        if (tree.x in 1580..1665 && tree.z in 3425..3540) return false
        return type.treeLevelReq >= 15
    }

    fun tick() {
        val now = clock.cycle
        for (tree in scheduled.values.filter { it.fireAt <= now || now - it.lastChopped > 400 }.toList()) {
            if (tree.fireAt <= now && now - tree.lastChopped <= 400) attemptSpawn(tree.origin)
            else scheduled.remove(tree.origin)
        }
        for (event in active.toList()) {
            if (!event.completed) advance(event, now)
            if (event.type == ForestryEventType.LEPRECHAUN) collectRainbows(event)
            if (now >= event.finish || event.completed) {
                finish(event)
                active.remove(event)
            }
        }
        cooldowns.entries.removeIf { it.value <= now }
        history.entries.removeIf { it.value.expired(now) }
    }

    private fun attemptSpawn(origin: CoordGrid) {
        val roll = scheduled.remove(origin) ?: return
        if (active.any { forestryNear(it.origin, origin, 30) }) return
        if (cooldowns.any { forestryNear(it.key, origin, 30) && it.value > clock.cycle }) return
        val nearby = players.findAll(ZoneKey.from(origin), zoneRadius = 4)
            .filter { forestryNear(it.coords, origin, 30) }.toList()
        if (nearby.none { ForestryRations.hasKit(it) }) return
        if (Random.nextInt(100) >= ForestryRules.spawnPercent(roll.level, nearby.size)) return
        val eligible = nearby.filter { history[it]?.eligible(origin, clock.cycle) == true }.toSet()
        val event = Event(roll.type, origin, clock.cycle, clock.cycle + roll.type.ticks,
            eligible, nearby.first().coords)
        prepare(event)
        if (!playable(event)) {
            discard(event)
            return
        }
        active.add(event)
        nearby.forEach { it.mes("A Forestry event has appeared: " + event.type.title + "!") }
    }

    /**
     * Developer-only event entry point, used by the ::forestry command in live-client tests.
     * Does not affect normal spawn chances or allow overlapping events.
     */
    fun debugSpawn(player: Player, type: ForestryEventType): String? {
        if (active.any { forestryNear(it.origin, player.coords, 30) })
            return "A Forestry event is already active nearby. Wait for it to finish."
        val event = Event(type, player.coords, clock.cycle, clock.cycle + type.ticks,
            setOf(player), player.coords)
        prepare(event)
        if (!playable(event)) {
            discard(event)
            return "Cannot spawn ${type.title}: required assets or reachable space are unavailable."
        }
        active.add(event)
        return null
    }

    /** A partial asset match should not create an unfinishable event. */
    private fun playable(e: Event): Boolean {
        val locRoles = e.locs.values
        val npcRoles = e.npcs.values
        return when (e.type) {
            ForestryEventType.ROOTS -> locRoles.count { it.startsWith("root:") } == 6 &&
                ForestryAssets.loc(ForestryAssets.INFUSED_ROOT) != null
            ForestryEventType.SAPLING -> "sapling" in locRoles &&
                locRoles.count { it.startsWith("ingredient:") } == 5
            ForestryEventType.ENT -> npcRoles.count { it.startsWith("ent:") } == 5
            ForestryEventType.FLOWERS -> npcRoles.count { it.startsWith("bush:") } == 8
            ForestryEventType.LEPRECHAUN -> "bank" in npcRoles && locRoles.any { it.startsWith("rainbow:") }
            ForestryEventType.HIVE -> "hive" in npcRoles && "keeper" in npcRoles
            ForestryEventType.FOX -> "trap" in npcRoles && "fox" in npcRoles
            ForestryEventType.RITUAL -> "dryad" in npcRoles &&
                npcRoles.count { it.startsWith("circle:") } == 5
            ForestryEventType.PHEASANT -> "forester" in npcRoles &&
                locRoles.count { it.startsWith("nest:") } == 4 &&
                npcRoles.count { it.startsWith("pheasant:") } == 3
        }
    }

    private fun discard(e: Event) {
        for (npc in e.npcs.keys.toList()) if (npc.isSlotAssigned) npcs.del(npc, Int.MAX_VALUE)
        for (loc in e.locs.keys.toList()) if (locs.findExact(loc.coords, loc.shape)?.id == loc.id)
            locs.del(loc, Int.MAX_VALUE)
        e.npcs.clear()
        e.locs.clear()
    }

    private fun prepare(e: Event) {
        when (e.type) {
            ForestryEventType.ROOTS -> repeat(6) {
                spawnLoc(e, "root:" + it, it, ForestryAssets.ROOT)
            }
            ForestryEventType.SAPLING -> {
                spawnLoc(e, "sapling", 0, ForestryAssets.SAPLING)
                ForestryAssets.ingredients.forEachIndexed { i, symbol ->
                    spawnLoc(e, "ingredient:" + i, i + 1, symbol)
                }
            }
            ForestryEventType.ENT -> repeat(5) {
                spawnNpc(e, "ent:" + it, it, ForestryAssets.ENTLING)
            }
            ForestryEventType.FLOWERS -> {
                repeat(8) { i ->
                    spawnNpc(e, "bush:" + i, i, ForestryAssets.bushes[i])
                }
            }
            ForestryEventType.LEPRECHAUN -> {
                spawnNpc(e, "bank", 0, ForestryAssets.LEPRECHAUN)
                spawnNextRainbow(e)
            }
            ForestryEventType.HIVE -> {
                spawnNpc(e, "keeper", 0, ForestryAssets.KEEPER)
                spawnNpc(e, "hive", 1, ForestryAssets.HIVE)
            }
            ForestryEventType.FOX -> {
                spawnNpc(e, "fox", 0, ForestryAssets.FOX)
                repeat(3) { spawnNpc(e, "poacher", it + 1, ForestryAssets.POACHER) }
                spawnTrap(e)
            }
            ForestryEventType.RITUAL -> {
                spawnNpc(e, "dryad", 0, ForestryAssets.DRYAD)
                e.npcs.entries.firstOrNull { it.value == "dryad" }?.key?.let {
                    it.baseHitpointsLvl = 100
                    it.hitpoints = 1
                    it.heal(3, showHitsplat = true)
                }
                rotateCircles(e)
            }
            ForestryEventType.PHEASANT -> {
                spawnNpc(e, "forester", 0, ForestryAssets.FORESTER)
                repeat(4) { spawnLoc(e, "nest:" + it, it + 1, ForestryAssets.NEST) }
                arrangePheasants(e)
            }
        }
    }

    private fun tile(e: Event, slot: Int, width: Int = 1, length: Int = 1): CoordGrid? {
        val occupied = e.locs.keys.flatMap { loc ->
            val type = ServerCacheManager.getObject(loc.id) ?: return@flatMap emptyList()
            (0 until type.width).flatMap { x -> (0 until type.length).map { z ->
                loc.coords.translate(x, z)
            } }
        }.toSet() + e.npcs.keys.flatMap { npc ->
            (0 until npc.size).flatMap { x -> (0 until npc.size).map { z ->
                npc.coords.translate(x, z)
            } }
        }
        return placement.candidates(e.origin, slot, e.type == ForestryEventType.ROOTS)
            .firstOrNull { at ->
                at != e.accessFrom && placement.clear(at, width, length) &&
                    (0 until width).all { x -> (0 until length).all { z ->
                        val coords = at.translate(x, z)
                        coords !in occupied && locs.findAll(coords).none { it.layer == 2 }
                    } } && placement.reachable(e.accessFrom, at)
            }
    }

    private fun spawnLoc(e: Event, role: String, slot: Int, label: String) {
        val type = ForestryAssets.loc(label) ?: return
        val at = tile(e, slot, type.width, type.length) ?: return
        val placed = locs.add(at, type.internalName, (e.finish - clock.cycle).coerceAtLeast(1),
            LocAngle.West, LocShape.CentrepieceStraight)
        if (locs.findExact(at, type) != null) e.locs[placed] = role
    }

    private fun spawnNpc(e: Event, role: String, slot: Int, label: String) {
        val type = ForestryAssets.npc(label) ?: return
        spawnNpcType(e, role, slot, type)
    }

    private fun spawnNpcType(e: Event, role: String, slot: Int, type: dev.openrune.types.NpcServerType) {
        val at = tile(e, slot, type.size, type.size) ?: return
        val entity = Npc(type, at)
        entity.mode = NpcMode.None
        npcs.add(entity, (e.finish - clock.cycle).coerceAtLeast(1))
        e.npcs[entity] = role
        if (role.startsWith("ent:")) {
            val index = role.substringAfter(":").toInt()
            entity.say(ForestryRules.entRequests[e.entStyles[index]])
        }
    }

    private fun replaceLoc(e: Event, role: String, symbol: String) {
        val old = e.locs.entries.firstOrNull { it.value == role }?.key ?: return
        val type = ForestryAssets.loc(symbol) ?: return
        if (old.id == type.id) return
        if (locs.findExact(old.coords, old.shape)?.id != old.id) return
        val replacement = locs.add(old.coords, type.internalName,
            (e.finish - clock.cycle).coerceAtLeast(1), old.angle, old.shape)
        if (locs.findExact(old.coords, type) != null) {
            e.locs.remove(old)
            e.locs[replacement] = role
            if (role.startsWith("root:")) {
                for (player in e.contributions.keys) {
                    val interaction = player.interaction as? InteractionLocOp ?: continue
                    if (interaction.target.coords != old.coords || interaction.target.id != old.id)
                        continue
                    player.interaction = InteractionLocOp(interaction.op,
                        BoundLocInfo(replacement, type), interaction.hasOpTrigger,
                        interaction.hasApTrigger, interaction.apRange)
                }
            }
        }
    }

    /** Rainbows are non-interactive scenery: spawn them serially and reward standing on a tile. */
    private fun spawnNextRainbow(e: Event) {
        if (e.rainbowsSpawned >= 6) return
        for (old in e.locs.filterValues { it.startsWith("rainbow:") }.keys.toList()) {
            locs.del(old, Int.MAX_VALUE)
            e.locs.remove(old)
        }
        val index = e.rainbowsSpawned
        spawnLoc(e, "rainbow:" + index, index + 1, ForestryAssets.RAINBOW)
        if (e.locs.values.contains("rainbow:" + index)) {
            e.rainbowsSpawned++
        }
        e.nextRainbow = clock.cycle + Random.nextInt(16, 21)
    }

    private fun collectRainbows(e: Event) {
        val nearby = players.findAll(ZoneKey.from(e.origin), zoneRadius = 4)
            .filter { forestryNear(it.coords, e.origin, 30) }.toList()
        for ((rainbow, role) in e.locs) {
            if (!role.startsWith("rainbow:")) continue
            val id = role.substringAfter(":").toInt()
            for (player in nearby) {
                // A rainbow has no click action; the player must physically stand inside it.
                if (player.coords != rainbow.coords) continue
                val touched = e.rainbowTouched.getOrPut(player) { mutableSetOf() }
                if (!touched.add(id)) continue
                val previous = ForestryLeprechaunLuck.units(player)
                val current = ForestryLeprechaunLuck.collect(player)
                if (current > previous) player.mes(
                    "You feel more in touch with the trees after standing in the rainbow. " +
                        "Leprechaun's luck: ${current}/255."
                ) else player.mes("Your leprechaun's luck is already at its maximum.")
            }
        }
    }

    private fun spawnTrap(e: Event) {
        if (e.phase >= 15) return
        spawnNpc(e, "trap", 6 + (e.phase % 6), ForestryAssets.TRAP)
        e.trapActive = e.npcs.values.contains("trap")
        e.lastPhase = clock.cycle
    }

    private fun removeTrap(e: Event) {
        val traps = e.npcs.filterValues { it == "trap" }.keys.toList()
        for (trap in traps) {
            npcs.del(trap, Int.MAX_VALUE)
            e.npcs.remove(trap)
        }
        e.trapActive = false
    }

    private fun rotateCircles(e: Event) {
        e.ritualHealed = false
        val colour = Random.nextInt(4)
        val shape = Random.nextInt(4)
        e.circles.clear()
        e.circles.add(colour to shape)
        e.circles.add(colour to (shape + 1) % 4)
        e.circles.add((colour + 1) % 4 to shape)
        e.circles.add((colour + 1) % 4 to (shape + 1) % 4)
        e.circles.add((colour + 2) % 4 to (shape + 2) % 4)
        e.circles.shuffle()
        e.circleAnswer = ForestryRules.validCircle(e.circles)
        for (npc in e.npcs.filterValues { it.startsWith("circle:") }.keys.toList()) {
            npcs.del(npc, Int.MAX_VALUE)
            e.npcs.remove(npc)
        }
        for (i in e.circles.indices) {
            val (colourIndex, shapeIndex) = e.circles[i]
            val type = ForestryAssets.npc(ForestryAssets.circles[shapeIndex * 4 + colourIndex])
                ?: continue
            spawnNpcType(e, "circle:" + i, i + 1, type)
        }
    }

    private fun arrangePheasants(e: Event) {
        for (npc in e.npcs.filterValues { it.startsWith("pheasant:") }.keys.toList()) {
            if (npc.isSlotAssigned) npcs.del(npc, Int.MAX_VALUE)
            e.npcs.remove(npc)
        }
        val type = ForestryAssets.npc(ForestryAssets.PHEASANT) ?: return
        for (i in 0..3) {
            replaceLoc(e, "nest:$i", if (i == e.emptyNest) ForestryAssets.EMPTY_NEST
                else ForestryAssets.NEST)
            if (i == e.emptyNest) continue
            val at = e.locs.entries.firstOrNull { it.value == "nest:$i" }?.key?.coords ?: continue
            val bird = Npc(type, at)
            bird.mode = NpcMode.None
            npcs.add(bird, (e.finish - clock.cycle).coerceAtLeast(1))
            e.npcs[bird] = "pheasant:$i"
        }
    }

    private fun collectRitual(e: Event) {
        val circle = e.npcs.entries.firstOrNull { it.value == "circle:${e.circleAnswer}" }
            ?.key ?: return
        for (player in players.findAll(ZoneKey.from(e.origin), zoneRadius = 4)) {
            if (player.coords != circle.coords) continue
            val c = contribution(e, player)
            if (c.lastRound == e.phase) continue
            c.lastRound = e.phase
            c.actions++
            player.statAdvance("stat.woodcutting", (if (c.eligible)
                ForestryRules.ritualXp(player.woodcuttingLvl) else 1.0) *
                xpMods.get(player, "stat.woodcutting"))
            give(player, "obj.forestry_currency", c.takeBark(2 + player.woodcuttingLvl / 25))
            if (!e.ritualHealed) {
                e.npcs.entries.firstOrNull { it.value == "dryad" }?.key?.heal(12, true)
                e.ritualHealed = true
            }
            player.mes("You correctly identify the unique ritual circle.")
        }
    }

    private fun advance(e: Event, now: Int) {
        when (e.type) {
            ForestryEventType.LEPRECHAUN -> {
                if (now >= e.finish - 38 && !e.rainbowWarning) {
                    e.rainbowWarning = true
                    players.findAll(ZoneKey.from(e.origin), zoneRadius = 4)
                        .filter { forestryNear(it.coords, e.origin, 30) }
                        .forEach { it.mes("Woodcutting Leprechaun: I'll have to go shortly...") }
                    // The final rainbow appears as the leprechaun gives his leaving warning.
                    if (e.rainbowsSpawned == 5) spawnNextRainbow(e)
                } else if (now >= e.nextRainbow && e.rainbowsSpawned < 6 &&
                    !(e.rainbowsSpawned == 5 && !e.rainbowWarning)) {
                    spawnNextRainbow(e)
                }
            }
            ForestryEventType.ROOTS -> {
                val phase = ForestryRules.infusedPhase(now - e.start)
                if (phase >= 0 && phase != e.rootPhase) {
                    if (e.infusedRoot >= 0) replaceLoc(e, "root:${e.infusedRoot}", ForestryAssets.ROOT)
                    e.rootPhase = phase
                    e.infusedRoot = if (e.infusedRoot < 0) Random.nextInt(6)
                        else (e.infusedRoot + Random.nextInt(1, 6)) % 6
                    replaceLoc(e, "root:${e.infusedRoot}", ForestryAssets.INFUSED_ROOT)
                }
            }
            ForestryEventType.ENT -> if (now - e.lastPhase >= 10) {
                e.lastPhase = now
                for ((npc, role) in e.npcs) {
                    if (!role.startsWith("ent:")) continue
                    val i = role.substringAfter(":").toInt()
                    if (e.entPrunes[i].containsAll(ForestryRules.entOptions[e.entStyles[i]])) continue
                    npc.say(ForestryRules.entRequests[e.entStyles[i]])
                    val at = tile(e, i + e.phase, npc.size, npc.size) ?: continue
                    placement.path(npc.coords, at)?.let { npc.walk(it) }
                }
                e.phase++
            }
            ForestryEventType.FOX -> {
                if (now - e.lastPhase >= 12) {
                    if (e.trapActive) {
                        e.foxHits++
                        removeTrap(e)
                    }
                    e.phase++
                    if (e.foxHits >= 3 || e.phase >= 15) e.completed = true
                    else spawnTrap(e)
                }
            }
            ForestryEventType.FLOWERS -> if (now - e.lastPhase >= 60) {
                e.phase++
                e.lastPhase = now
                e.partnerA = Random.nextInt(8)
                e.partnerB = (e.partnerA + Random.nextInt(1, 8)) % 8
                e.contributions.values.forEach { it.pollen = -1 }
            }
            ForestryEventType.RITUAL -> {
                collectRitual(e)
                if (now - e.lastPhase >= 25) {
                    e.phase++
                    e.lastPhase = now
                    if (e.phase < 8) rotateCircles(e)
                    else e.completed = true
                }
            }
            ForestryEventType.PHEASANT -> if (now - e.lastPhase >= 12) {
                e.lastPhase = now
                val landing = e.locs.entries.firstOrNull { it.value == "nest:${e.emptyNest}" }
                    ?.key?.coords
                if (landing != null) {
                    for (player in players.findAll(ZoneKey.from(e.origin), zoneRadius = 4)) {
                        if (!forestryNear(player.coords, landing, 1)) continue
                        player.delay(3)
                        val c = e.contributions[player]
                        if (c != null && ForestrySupplies.deliverEgg(player)) {
                            c.eggNest = -1
                            player.mes("The returning pheasant stuns you and steals its egg!")
                        } else player.mes("The returning pheasant stuns you!")
                    }
                }
                e.phase++
                if (e.phase >= 8) e.completed = true
                else {
                    e.emptyNest = (e.emptyNest + Random.nextInt(1, 4)) % 4
                    arrangePheasants(e)
                }
            }
            else -> Unit
        }
    }

    private fun finish(e: Event) {
        cooldowns[e.origin] = clock.cycle + Random.nextInt(67, 201)
        for (player in e.contributions.keys) {
            if (e.type == ForestryEventType.SAPLING) ForestrySupplies.remove(player, ForestryAssets.mulch)
            if (e.type == ForestryEventType.PHEASANT) ForestrySupplies.remove(player, listOf(ForestryAssets.EGG))
        }
        if (e.type == ForestryEventType.LEPRECHAUN) {
            // Depositing and collecting rainbows give no completion XP/bark.
            // The luck attribute survives this cleanup and is spent only while chopping.
            discard(e)
            return
        }
        val success = when (e.type) {
            ForestryEventType.SAPLING -> e.growth >= 400
            ForestryEventType.FOX -> e.foxHits < 3
            else -> true
        }
        val onlineNearby = players.findAll(ZoneKey.from(e.origin), zoneRadius = 4)
            .filter { forestryNear(it.coords, e.origin, 30) }.toSet()
        for ((player, c) in e.contributions) {
            if (player !in onlineNearby || !c.eligible || c.actions == 0) continue
            if (success && e.type != ForestryEventType.PHEASANT) {
                give(player, "obj.forestry_currency", c.takeBark(25 + c.actions * 2))
                when (e.type) {
                    ForestryEventType.SAPLING -> giveLeaves(player)
                    ForestryEventType.ENT -> {
                        giveLeaves(player)
                        val pruned = e.entPrunes.indices.count {
                            e.entPrunes[it].containsAll(ForestryRules.entOptions[e.entStyles[it]])
                        }
                        if (Random.nextInt(5) < pruned)
                            objects.add(ordinaryBirdNest(Random.nextInt(3)), player.coords, 300, player, 1)
                    }
                    ForestryEventType.HIVE -> if (c.hives.size >= e.phase && Random.nextInt(3) != 0)
                        giveNamed(player, "Sturdy beehive parts")
                    ForestryEventType.FOX -> if (Random.nextInt(30) == 0) giveNamed(player, "Fox whistle")
                    ForestryEventType.RITUAL -> if (Random.nextInt(30) == 0) giveNamed(player, "Petal garland")
                    else -> Unit
                }
            }
            if (success && e.type != ForestryEventType.PHEASANT) {
                // Bonus is proportional to completed actions and the visible Woodcutting level.
                val bonus = if (e.type == ForestryEventType.RITUAL)
                    ForestryRules.ritualBonus(player.woodcuttingLvl, c.actions)
                    else (player.woodcuttingLvl + 1) * c.actions.coerceAtMost(15) * 0.6
                player.statAdvance("stat.woodcutting", bonus * xpMods.get(player, "stat.woodcutting"))
            }
            player.mes(if (success) "The " + e.type.title + " event has ended."
                else "The " + e.type.title + " event was unsuccessful.")
        }
        discard(e)
    }

    private fun giveLeaves(player: Player) {
        val labels = listOf("Leaves", "Oak leaves", "Willow leaves", "Maple leaves", "Yew leaves", "Magic leaves")
        giveNamed(player, labels.random(), 20)
    }
    private fun giveNamed(player: Player, name: String, count: Int = 1) {
        val type = ServerCacheManager.getItems().values.firstOrNull {
            it.name.equals(name, ignoreCase = true)
        } ?: return
        give(player, type.internalName, count)
    }
    private fun give(player: Player, name: String, amount: Int) {
        if (amount <= 0) return
        val type = ServerCacheManager.getItems().values.firstOrNull { it.internalName == name } ?: return
        val stored = player.invMap[ForestryRations.STORAGE]
        val inventory = if (name == "obj.forestry_currency" && ForestryRations.hasKit(player) &&
            stored != null && stored.type.scope == InvScope.Perm) stored else player.inv
        val stack = type.isStackable
        val existing = if (stack) inventory.indices.firstOrNull {
            inventory[it]?.let { obj -> getInvObj(obj).id == type.id } == true
        } else null
        if (existing != null) {
            val old = inventory[existing]!!
            inventory[existing] = old.copy(count = old.count + amount)
            return
        }
        var remaining = amount
        for (slot in inventory.indices) {
            if (inventory[slot] != null) continue
            val added = if (stack) remaining else 1
            inventory[slot] = InvObj(type.internalName, added)
            remaining -= added
            if (remaining == 0) return
        }
        objects.add(type.internalName, player.coords, 300, player, remaining)
    }

    private fun contribution(e: Event, player: Player): ForestryContribution =
        e.contributions.getOrPut(player) {
            if (e.type == ForestryEventType.SAPLING) ForestrySupplies.remove(player, ForestryAssets.mulch)
            if (e.type == ForestryEventType.PHEASANT) ForestrySupplies.remove(player, listOf(ForestryAssets.EGG))
            val eligible = player in e.eligibleAtStart && player !in e.excluded
            if (!eligible) player.mes("You were not chopping nearby when this event began, so full rewards are unavailable.")
            ForestryContribution(eligible)
        }

    private fun ProtectedAccess.reward(c: ForestryContribution, xp: Double, skill: String = "stat.woodcutting") {
        c.actions++
        statAdvance(skill, (if (c.eligible) xp else 1.0) * xpMods.get(player, skill))
        give(player, "obj.forestry_currency", c.takeBark(2 + player.woodcuttingLvl / 25))
    }

    fun ProtectedAccess.interactLoc(target: BoundLocInfo) {
        val e = active.firstOrNull { session ->
            session.locs.any { (loc, _) -> loc.coords == target.coords && loc.id == target.id }
        } ?: return
        val role = e.locs.entries.first { it.key.coords == target.coords && it.key.id == target.id }.value
        val c = contribution(e, player)
        if (role.startsWith("root:") && e.type == ForestryEventType.ROOTS) {
            chopRoot(e, c, role)
            return
        }
        if (!c.ready(clock.cycle)) return
        when {
            role.startsWith("ingredient:") && e.type == ForestryEventType.SAPLING -> {
                if (c.ingredients.size == 3 &&
                    ForestrySupplies.has(player, ForestryAssets.mulch.last())) {
                    mes("Add the mulch to the sapling before gathering more ingredients.")
                } else {
                    if (ForestrySupplies.gather(player, c, role.substringAfter(":").toInt()))
                        mes("You gather an ingredient for your mulch (" + c.ingredients.size + "/3).")
                    else mes("You need a free inventory slot to collect mulch.")
                }
            }
            role == "sapling" && e.type == ForestryEventType.SAPLING -> {
                if (c.ingredients.size != 3 || !ForestrySupplies.has(player, ForestryAssets.mulch.last())) {
                    mes("You need to gather three ingredients for mulch.")
                } else {
                    val nutrition = ForestryRules.mulchNutrition(e.recipe, c.ingredients)
                    e.growth += nutrition
                    ForestrySupplies.remove(player, ForestryAssets.mulch)
                    c.ingredients.clear()
                    reward(c, nutrition * (1 + player.woodcuttingLvl / 30.0))
                    statAdvance("stat.farming", if (c.eligible) nutrition.toDouble() else 1.0)
                    mes("Your mulch has " + nutrition + "% nutritional value.")
                    if (e.growth >= 400) {
                        replaceLoc(e, "sapling", ForestryAssets.THRIVING_SAPLING)
                        e.completed = true
                    }
                }
            }
            role.startsWith("nest:") && e.type == ForestryEventType.PHEASANT -> {
                val nest = role.substringAfter(":").toInt()
                if (ForestrySupplies.has(player, ForestryAssets.EGG)) {
                    mes("You can only carry one pheasant egg at a time.")
                } else if (nest != e.emptyNest) {
                    mes("A pheasant guards this nest! Try a different nest.")
                    player.delay(3)
                } else if (!ForestrySupplies.takeEgg(player)) {
                    mes("You need a free inventory slot to take an egg.")
                } else {
                    c.eggNest = nest
                    c.nextAction = clock.cycle + 2
                    c.lastRound = clock.cycle
                    if (c.eligible && Random.nextInt(ForestryRules.goldenEggDenominator(player.woodcuttingLvl)) == 0)
                        giveNamed(player, "Golden pheasant egg")
                    mes("You take a pheasant egg. Bring it to the Freaky Forester!")
                }
            }
        }
    }

    private fun ProtectedAccess.chopRoot(e: Event, c: ForestryContribution, role: String) {
        val root = e.locs.entries.firstOrNull { it.value == role }?.key ?: return
        if (clock.cycle >= e.finish || e.completed) return
        val axe = Woodcutting.findAxeForSpecialResource(player)
        if (axe == null) {
            mes("You need an axe to chop down the roots.")
            resetAnim()
            return
        }
        if (c.ready(clock.cycle)) {
            anim(WoodcuttingAxes.animation(getInvObj(axe).internalName) ?: RSCM.getReverseMapping(
                RSCMType.SEQ, WoodcuttingAxes.effectiveType(axe).axeWoodcuttingAnim.id))
            val infused = root.id == ForestryAssets.loc(ForestryAssets.INFUSED_ROOT)?.id
            reward(c, (if (infused) 42 else 15) + player.woodcuttingLvl * 1.5)
            if (infused) give(player, "obj.forestry_currency", c.takeBark(8))
            mes(if (infused) "You cut an anima-infused root." else "You cut a tree root.")
        }
        val type = ServerCacheManager.getObject(root.id) ?: return
        opLoc1(BoundLocInfo(root, type))
    }

    private fun ProtectedAccess.buildHive(e: Event, c: ForestryContribution) {
                val slot = player.inv.indices.firstOrNull { index ->
                    player.inv[index]?.let { getInvObj(it).internalName in ForestryRules.logs } == true
                }
                if (slot == null) {
                    mes("You need logs to help build the beehive.")
                } else {
                    val logs = player.inv[slot]!!
                    player.inv[slot] = if (logs.count > 1) logs.copy(count = logs.count - 1) else null
                    e.hiveProgress++
                    c.hives.add(e.phase)
                    reward(c, player.woodcuttingLvl * 0.9)
                    statAdvance("stat.construction", if (c.eligible) 12.0 else 1.0)
                    if (e.hiveProgress >= 3) {
                        e.hiveProgress = 0
                        e.phase++
                        mes("The beehive is finished!")
                        if (e.phase >= 6) e.completed = true
                    }
                }
    }

    fun ProtectedAccess.interactNpc(target: Npc, option: Int) {
        val e = active.firstOrNull { target in it.npcs } ?: return
        val role = e.npcs[target] ?: return
        val c = contribution(e, player)
        if (!c.ready(clock.cycle)) return
        when {
            role == "hive" && e.type == ForestryEventType.HIVE -> buildHive(e, c)
            role.startsWith("ent:") && e.type == ForestryEventType.ENT -> {
                val i = role.substringAfter(":").toInt()
                val wanted = ForestryRules.entOptions[e.entStyles[i]]
                target.say(ForestryRules.entRequests[e.entStyles[i]])
                if (option == 1) {
                    mes("Choose Prune-top, Prune-back or Prune-sides to match the entling's request.")
                } else if (option !in wanted) {
                    mes("The entling does not like that haircut.")
                    player.delay(3)
                } else if (e.entPrunes[i].add(option)) {
                    reward(c, 10.0 + player.woodcuttingLvl)
                    statAdvance("stat.fletching", if (c.eligible) 9.0 else 1.0)
                    if (e.entPrunes[i].containsAll(wanted)) {
                        c.entlings.add(i)
                        ForestryAssets.npc(ForestryAssets.PRUNED_ENTLING)?.let {
                            target.transmog(it, (e.finish - clock.cycle).coerceAtLeast(1))
                        }
                        target.abortRoute()
                        target.say("That's perfect!")
                        mes("The entling is happy with its haircut.")
                    }
                    if (e.entPrunes.indices.all {
                        e.entPrunes[it].containsAll(ForestryRules.entOptions[e.entStyles[it]])
                    })
                        e.completed = true
                } else mes("You have already pruned that part.")
            }
            role.startsWith("bush:") && e.type == ForestryEventType.FLOWERS -> {
                val i = role.substringAfter(":").toInt()
                if (i != e.partnerA && i != e.partnerB) {
                    mes("The bees have no pollen for this bush.")
                } else if (c.pollen == -1) {
                    c.pollen = i
                    mes("You collect strange pollen. Find its matching bush.")
                } else if (c.pollen != i) {
                    c.pollen = -1
                    c.lastRound = e.phase
                    reward(c, 12.0 + player.woodcuttingLvl)
                    mes("The flowers are successfully pollinated.")
                } else mes("Take the pollen to the other flowering bush.")
            }
            role == "bank" && e.type == ForestryEventType.LEPRECHAUN -> {
                // Players chopping nearby when he appeared may use him as a deposit box;
                // later arrivals can deposit only Woodcutting resources.
                if (IronmanRestrictions.blockUimBank(player)) return
                val fullDeposit = player in e.eligibleAtStart && player !in e.excluded
                val bank = player.invMap.getOrPut("inv.bank")
                var deposits = 0
                for (slot in player.inv.indices) {
                    val obj = player.inv[slot] ?: continue
                    val type = getInvObj(obj)
                    if (!fullDeposit && type.internalName !in ForestryRules.logs &&
                        type.internalName !in ForestryRules.leaves &&
                        !type.name.lowercase().contains(" logs")) continue
                    if (player.invTransfer(player.inv, slot, obj.count, bank).success) deposits++
                }
                mes(when {
                    deposits > 0 -> "The Woodcutting Leprechaun deposits your items in your bank."
                    fullDeposit -> "You have nothing to deposit or your bank is full."
                    else -> "Only Woodcutting resources can be deposited, or your bank is full."
                })
            }
            role == "trap" && e.type == ForestryEventType.FOX -> {
                if (!e.trapActive) return
                removeTrap(e)
                reward(c, 10.0 + player.woodcuttingLvl)
                statAdvance("stat.hunter", if (c.eligible) 18.0 else 1.0)
                mes("You disarm the fox trap.")
            }
            role == "forester" && e.type == ForestryEventType.PHEASANT -> {
                if (c.eggNest < 0 || !ForestrySupplies.deliverEgg(player))
                    mes("Bring me an egg from an unguarded pheasant nest.")
                else {
                    c.eggNest = -1
                    reward(c, 14.0 + player.woodcuttingLvl)
                    statAdvance("stat.thieving", if (c.eligible) 20.0 else 1.0)
                    if (c.eligible) giveNamed(player, "Pheasant tail feathers")
                    mes("You deliver the pheasant egg.")
                }
            }
            role == "keeper" && e.type == ForestryEventType.HIVE ->
                mes("Use logs on the unfinished beehive to help the bees.")
            role == "dryad" && e.type == ForestryEventType.RITUAL ->
                mes("Find the circle with the unique colour and shape.")
            role == "fox" && e.type == ForestryEventType.FOX ->
                mes("The frightened fox needs you to disarm the traps!")
        }
    }

    /** Event interaction hooks are installed only for real cache-backed definitions. */
    fun eventLocNames(): List<String> = ForestryAssets.locNames.mapNotNull {
        ForestryAssets.loc(it)?.internalName
    }
    fun eventNpcNames(): List<String> = ForestryAssets.npcNames.mapNotNull {
        ForestryAssets.npc(it)?.internalName
    }

    fun onLogout(player: Player) {
        ForestrySupplies.remove(player, ForestryAssets.mulch + ForestryAssets.EGG)
        for (e in active) {
            e.contributions.remove(player)
            e.excluded.add(player)
        }
    }

    fun shutdown() {
        for (e in active) {
            for (player in e.contributions.keys)
                ForestrySupplies.remove(player, ForestryAssets.mulch + ForestryAssets.EGG)
            discard(e)
        }
        active.clear()
        scheduled.clear()
    }
}

class ForestryEventScript @Inject constructor(
    private val events: ForestryEventManager,
) : PluginScript() {
    override fun ScriptContext.startup() {
        onEvent<GameLifecycle.LateCycle> { events.tick() }
        onEvent<SessionStateEvent.Logout> { events.onLogout(player) }
        onCommand("forestry") {
            desc = "Spawn a Forestry event for developer testing"
            invalidArgs = "Usage: ::forestry ROOTS|SAPLING|ENT|FLOWERS|LEPRECHAUN|HIVE|FOX|RITUAL|PHEASANT"
            cheat {
                val type = ForestryEventType.entries.firstOrNull {
                    it.name.equals(args.firstOrNull(), ignoreCase = true)
                }
                when {
                    type == null -> player.mes("Usage: ::forestry ROOTS|SAPLING|ENT|FLOWERS|LEPRECHAUN|HIVE|FOX|RITUAL|PHEASANT")
                    else -> player.mes(events.debugSpawn(player, type) ?: "Spawned " + type.title + ".")
                }
            }
        }
        for (loc in events.eventLocNames()) {
            onOpLoc1(loc) { with(events) { interactLoc(it.loc) } }
        }
        for (npc in events.eventNpcNames()) {
            onOpNpc1(npc) { with(events) { interactNpc(it.npc, 1) } }
            onOpNpc2(npc) { with(events) { interactNpc(it.npc, 2) } }
            onOpNpc3(npc) { with(events) { interactNpc(it.npc, 3) } }
            onOpNpc4(npc) { with(events) { interactNpc(it.npc, 4) } }
            onOpNpc5(npc) { with(events) { interactNpc(it.npc, 5) } }
        }
    }

    override fun ScriptContext.shutdown() {
        events.shutdown()
    }
}
