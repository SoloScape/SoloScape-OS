package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.types.NpcMode
import dev.openrune.types.ObjectServerType
import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlin.random.Random
import org.rsmod.api.game.process.GameLifecycle
import org.rsmod.api.invtx.invTransfer
import org.rsmod.api.player.output.mes
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.stat.woodcuttingLvl
import org.rsmod.api.repo.loc.LocRepository
import org.rsmod.api.repo.npc.NpcRepository
import org.rsmod.api.repo.obj.ObjRepository
import org.rsmod.api.repo.player.PlayerRepository
import org.rsmod.api.script.onEvent
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpNpc1
import org.rsmod.api.script.onOpNpc2
import org.rsmod.api.script.onOpNpc3
import org.rsmod.game.MapClock
import org.rsmod.content.skills.woodcutting.scripts.Woodcutting.Companion.treeLevelReq
import org.rsmod.game.entity.Npc
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.loc.LocAngle
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.loc.LocShape
import org.rsmod.game.type.getInvObj
import org.rsmod.map.CoordGrid
import org.rsmod.map.zone.ZoneKey
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

/**
 * Forestry activity is world-shared, not an independent roll per player.
 * Everything here is short-lived. Only earned XP/items are persistent.
 *
 * Native game-cache objects and NPCs are resolved by their display names instead of synthetic
 * IDs. This prevents a mismatched cache revision from silently spawning unrelated objects.
 */
@Singleton
class ForestryEventManager @Inject constructor(
    private val clock: MapClock,
    private val players: PlayerRepository,
    private val locs: LocRepository,
    private val npcs: NpcRepository,
    private val objects: ObjRepository,
) {
    private data class TreeRoll(
        val origin: CoordGrid,
        val type: ForestryEventType,
        val fireAt: Int,
        var lastChopped: Int,
    )
    private class Event(
        val type: ForestryEventType,
        val origin: CoordGrid,
        val start: Int,
        val finish: Int,
        val eligibleAtStart: Set<Player>,
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
        var guardedNest = Random.nextInt(4)
    }

    private val history = java.util.WeakHashMap<Player, ForestryHistory>()
    private val scheduled = mutableMapOf<CoordGrid, TreeRoll>()
    private val active = mutableListOf<Event>()
    private val cooldowns = mutableMapOf<CoordGrid, Int>()

    /** Called on every actual 4-tick skilling roll, even when no log is awarded. */
    fun onChop(player: Player, tree: CoordGrid, type: ObjectServerType, fallen: Boolean) {
        val cycle = clock.cycle
        history.getOrPut(player) { ForestryHistory() }.record(tree, cycle)
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
        scheduled[tree] = TreeRoll(tree, selected, cycle + Random.nextInt(67, 201), cycle)
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
        if (Random.nextInt(100) >= ForestryRules.spawnPercent(30, nearby.size)) return
        val eligible = nearby.filter { history[it]?.eligible(origin, clock.cycle) == true }.toSet()
        val event = Event(roll.type, origin, clock.cycle, clock.cycle + roll.type.ticks, eligible)
        prepare(event)
        if (event.locs.isEmpty() && event.npcs.isEmpty()) return
        active.add(event)
        cooldowns[origin] = clock.cycle + Random.nextInt(67, 201)
        nearby.forEach { it.mes("A Forestry event has appeared: " + event.type.title + "!") }
    }

    private fun prepare(e: Event) {
        when (e.type) {
            ForestryEventType.ROOTS -> repeat(6) { spawnLoc(e, "root", it, "Tree roots") }
            ForestryEventType.SAPLING -> {
                spawnLoc(e, "sapling", 0, "Struggling sapling")
                listOf("Droppings", "Green leaves", "Rotting leaves", "Splintered bark",
                    "Wild mushrooms").forEachIndexed { i, label -> spawnLoc(e, "ingredient:" + i, i + 1, label) }
            }
            ForestryEventType.ENT -> repeat(5) { spawnNpc(e, "ent:" + it, it, "Entling") }
            ForestryEventType.FLOWERS -> {
                val variants = ServerCacheManager.getNpcs().values
                    .filter { normalized(it.name).startsWith("flowering bush") }
                    .distinctBy { it.id }.sortedBy { it.id }
                repeat(8) { i ->
                    val type = variants.getOrNull(i) ?: npcType("Flowering bush")
                    if (type != null) spawnNpcType(e, "bush:" + i, i, type)
                }
            }
            ForestryEventType.LEPRECHAUN -> {
                spawnNpc(e, "bank", 0, "Woodcutting Leprechaun")
                repeat(6) { spawnLoc(e, "rainbow", it + 1, "End of Rainbow") }
            }
            ForestryEventType.HIVE -> {
                spawnNpc(e, "keeper", 0, "Bee keeper")
                spawnNpc(e, "hive", 1, "Unfinished beehive")
            }
            ForestryEventType.FOX -> {
                spawnNpc(e, "fox", 0, "Frightened Fox")
                repeat(3) { spawnNpc(e, "poacher", it + 1, "Poacher") }
                spawnTrap(e)
            }
            ForestryEventType.RITUAL -> {
                spawnNpc(e, "dryad", 0, "Dryad")
                rotateCircles(e)
            }
            ForestryEventType.PHEASANT -> {
                spawnNpc(e, "forester", 0, "Freaky Forester")
                repeat(4) { spawnLoc(e, "nest:" + it, it + 1, "Pheasant nest") }
                repeat(3) { spawnNpc(e, "pheasant", it + 5, "Pheasant") }
            }
        }
    }

    private fun normalized(name: String): String =
        name.lowercase().replace("-", " ").replace("_", " ").trim()

    private fun locType(label: String) = ServerCacheManager.getObjects().values.firstOrNull {
        normalized(it.name) == normalized(label) ||
            (normalized(it.name).contains(normalized(label)) && it.name.length < label.length + 12)
    }
    private fun npcType(label: String) = ServerCacheManager.getNpcs().values.firstOrNull {
        normalized(it.name) == normalized(label)
    }

    private fun tile(e: Event, slot: Int): CoordGrid {
        val dx = listOf(-3, -2, 0, 2, 3, 3, 2, 0, -2, -3, -4, 4, 1, -1, 4, -4)
        val dz = listOf(0, 2, 3, 2, 0, -2, -3, -3, -2, 0, 3, -3, 4, -4, 1, -1)
        val i = slot % dx.size
        return e.origin.translate(dx[i], dz[i])
    }

    private fun spawnLoc(e: Event, role: String, slot: Int, label: String) {
        val type = locType(label) ?: return
        val at = tile(e, slot)
        val placed = locs.add(at, type, (e.finish - clock.cycle).coerceAtLeast(1),
            LocAngle.West, LocShape.CentrepieceStraight)
        if (locs.findExact(at, type) != null) e.locs[placed] = role
    }

    private fun spawnNpc(e: Event, role: String, slot: Int, label: String) {
        val type = npcType(label) ?: return
        spawnNpcType(e, role, slot, type)
    }

    private fun spawnNpcType(e: Event, role: String, slot: Int, type: dev.openrune.types.NpcServerType) {
        val entity = Npc(type, tile(e, slot))
        entity.mode = NpcMode.None
        npcs.add(entity, (e.finish - clock.cycle).coerceAtLeast(1))
        e.npcs[entity] = role
    }

    private fun spawnTrap(e: Event) {
        if (e.phase >= 15) return
        spawnNpc(e, "trap", 6 + (e.phase % 6), "Fox trap")
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
        val colour = Random.nextInt(4)
        val shape = Random.nextInt(4)
        e.circles.clear()
        repeat(4) { e.circles.add(colour to shape) }
        e.circles.add((colour + 1) % 4 to (shape + 1) % 4)
        e.circles.shuffle()
        e.circleAnswer = ForestryRules.validCircle(e.circles)
        for (npc in e.npcs.filterValues { it.startsWith("circle:") }.keys.toList()) {
            npcs.del(npc, Int.MAX_VALUE)
            e.npcs.remove(npc)
        }
        val variants = ServerCacheManager.getNpcs().values
            .filter { it.internalName.startsWith("npc.gathering_event_enchanted_ritual_") &&
                it.internalName.lastOrNull()?.isDigit() == true }
            .sortedBy { it.id }.distinctBy { it.id }
        for (i in e.circles.indices) {
            val (colourIndex, shapeIndex) = e.circles[i]
            val type = variants.getOrNull(shapeIndex * 4 + colourIndex)
                ?: npcType("Ritual circle") ?: continue
            spawnNpcType(e, "circle:" + i, i + 1, type)
        }
    }

    private fun advance(e: Event, now: Int) {
        when (e.type) {
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
            ForestryEventType.RITUAL -> if (now - e.lastPhase >= 25) {
                e.phase++
                e.lastPhase = now
                if (e.phase < 8) rotateCircles(e)
                else e.completed = true
            }
            ForestryEventType.PHEASANT -> if (now - e.lastPhase >= 12) {
                e.lastPhase = now
                e.guardedNest = Random.nextInt(4)
            }
            else -> Unit
        }
    }

    private fun finish(e: Event) {
        val success = when (e.type) {
            ForestryEventType.SAPLING -> e.growth >= 400
            ForestryEventType.FOX -> e.foxHits < 3
            else -> true
        }
        for ((player, c) in e.contributions) {
            if (!c.eligible || c.actions == 0) continue
            if (success) {
                give(player, "obj.forestry_currency", c.takeBark(25 + c.actions * 2))
                when (e.type) {
                    ForestryEventType.SAPLING, ForestryEventType.ENT -> giveLeaves(player)
                    ForestryEventType.HIVE -> if (c.hives.size >= e.phase && Random.nextInt(3) != 0)
                        giveNamed(player, "Sturdy beehive parts")
                    ForestryEventType.ENT -> if (c.entlings.isNotEmpty() &&
                        Random.nextInt(5) < e.entPrunes.count { it.isNotEmpty() })
                        give(player, ordinaryBirdNest(Random.nextInt(3)), 1)
                    ForestryEventType.FOX -> if (Random.nextInt(30) == 0) giveNamed(player, "Fox whistle")
                    ForestryEventType.RITUAL -> if (Random.nextInt(30) == 0) giveNamed(player, "Petal garland")
                    ForestryEventType.PHEASANT -> if (Random.nextBoolean()) giveNamed(player, "Pheasant tail feathers")
                    else -> Unit
                }
            }
            player.mes(if (success) "The " + e.type.title + " event has ended."
                else "The " + e.type.title + " event was unsuccessful.")
        }
        // Timed repository lifecycles remove the entities; do not create permanent spawns.
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
        val inventory = if (name == "obj.forestry_currency" && ForestryRations.hasKit(player) &&
            player.invMap[ForestryRations.STORAGE] != null) {
            player.invMap.getValue(ForestryRations.STORAGE)
        } else player.inv
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
            val eligible = player in e.eligibleAtStart && player !in e.excluded
            if (!eligible) player.mes("You were not chopping nearby when this event began, so full rewards are unavailable.")
            ForestryContribution(eligible)
        }

    private fun ProtectedAccess.reward(e: Event, c: ForestryContribution, xp: Double, skill: String = "stat.woodcutting") {
        c.actions++
        statAdvance(skill, if (c.eligible) xp else 1.0)
        give(player, "obj.forestry_currency", c.takeBark(2 + player.woodcuttingLvl / 25))
    }

    fun ProtectedAccess.interactLoc(target: BoundLocInfo) {
        val e = active.firstOrNull { session ->
            session.locs.any { (loc, _) -> loc.coords == target.coords && loc.id == target.id }
        } ?: return
        val role = e.locs.entries.first { it.key.coords == target.coords && it.key.id == target.id }.value
        val c = contribution(e, player)
        if (!c.ready(clock.cycle)) return
        when {
            role == "root" && e.type == ForestryEventType.ROOTS -> {
                val infused = ((clock.cycle - e.start) / 18) % 6 == 0
                reward(e, c, (if (infused) 42 else 15) + player.woodcuttingLvl * 1.5)
                if (infused) give(player, "obj.forestry_currency", c.takeBark(8))
                mes(if (infused) "You cut an anima-infused root." else "You cut a tree root.")
            }
            role.startsWith("ingredient:") && e.type == ForestryEventType.SAPLING -> {
                if (c.ingredients.size == 3) {
                    mes("Add the mulch to the sapling before gathering more ingredients.")
                } else {
                    c.ingredients.add(role.substringAfter(":").toInt())
                    mes("You gather an ingredient for your mulch (" + c.ingredients.size + "/3).")
                }
            }
            role == "sapling" && e.type == ForestryEventType.SAPLING -> {
                if (c.ingredients.size != 3) {
                    mes("You need to gather three ingredients for mulch.")
                } else {
                    val nutrition = ForestryRules.mulchNutrition(e.recipe, c.ingredients)
                    e.growth += nutrition
                    c.ingredients.clear()
                    reward(e, c, nutrition * (1 + player.woodcuttingLvl / 30.0))
                    statAdvance("stat.farming", if (c.eligible) nutrition.toDouble() else 1.0)
                    mes("Your mulch has " + nutrition + "% nutritional value.")
                    if (e.growth >= 400) e.completed = true
                }
            }
            role == "rainbow" && e.type == ForestryEventType.LEPRECHAUN -> {
                if (player.coords != target.coords) {
                    mes("Stand in the rainbow to collect its blessing.")
                } else reward(e, c, 10.0 + player.woodcuttingLvl * 1.5)
            }
            role == "hive" && e.type == ForestryEventType.HIVE -> {
                buildHive(e, c)
            }
            role.startsWith("circle:") && e.type == ForestryEventType.RITUAL -> {
                selectCircle(e, c, role)
            }
            role.startsWith("nest:") && e.type == ForestryEventType.PHEASANT -> {
                if (c.egg) {
                    mes("You can only carry one pheasant egg at a time.")
                } else if (role.substringAfter(":").toInt() == e.guardedNest) {
                    mes("A pheasant guards this nest! Try a different nest.")
                } else {
                    c.egg = true
                    c.nextAction = clock.cycle + 2
                    c.lastRound = clock.cycle
                    if (c.eligible && Random.nextInt(ForestryRules.goldenEggDenominator(player.woodcuttingLvl)) == 0)
                        giveNamed(player, "Golden pheasant egg")
                    mes("You take a pheasant egg. Bring it to the Freaky Forester!")
                }
            }
        }
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
                    reward(e, c, player.woodcuttingLvl * 0.9)
                    statAdvance("stat.construction", if (c.eligible) 12.0 else 1.0)
                    if (e.hiveProgress >= 3) {
                        e.hiveProgress = 0
                        e.phase++
                        mes("The beehive is finished!")
                        if (e.phase >= 6) e.completed = true
                    }
                }
    }

    private fun ProtectedAccess.selectCircle(e: Event, c: ForestryContribution, role: String) {
                val number = role.substringAfter(":").toInt()
                if (c.lastRound == e.phase) return
                c.lastRound = e.phase
                if (number == e.circleAnswer) {
                    reward(e, c, 18.0 + player.woodcuttingLvl * 1.2)
                    mes("You correctly identify the unique ritual circle.")
                } else mes("That circle is not the unique shape and colour.")
            }
    }

    fun ProtectedAccess.interactNpc(target: Npc, option: Int) {
        val e = active.firstOrNull { target in it.npcs } ?: return
        val role = e.npcs[target] ?: return
        val c = contribution(e, player)
        if (!c.ready(clock.cycle)) return
        when {
            role == "hive" && e.type == ForestryEventType.HIVE -> buildHive(e, c)
            role.startsWith("circle:") && e.type == ForestryEventType.RITUAL -> selectCircle(e, c, role)
            role.startsWith("ent:") && e.type == ForestryEventType.ENT -> {
                val i = role.substringAfter(":").toInt()
                val requests = listOf(setOf(2), setOf(1, 3), setOf(2, 3), setOf(1))
                val wanted = requests[e.entStyles[i]]
                if (option !in wanted) {
                    mes("The entling does not like that haircut.")
                } else if (e.entPrunes[i].add(option)) {
                    reward(e, c, 10.0 + player.woodcuttingLvl)
                    statAdvance("stat.fletching", if (c.eligible) 9.0 else 1.0)
                    if (e.entPrunes[i].containsAll(wanted)) {
                        c.entlings.add(i)
                        mes("The entling is happy with its haircut.")
                    }
                    if (e.entPrunes.indices.all { e.entPrunes[it].containsAll(requests[e.entStyles[it]]) })
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
                    reward(e, c, 12.0 + player.woodcuttingLvl)
                    mes("The flowers are successfully pollinated.")
                } else mes("Take the pollen to the other flowering bush.")
            }
            role == "bank" && e.type == ForestryEventType.LEPRECHAUN -> {
                val bank = player.invMap.getOrPut("inv.bank")
                var deposits = 0
                for (slot in player.inv.indices) {
                    val obj = player.inv[slot] ?: continue
                    if (getInvObj(obj).internalName !in ForestryRules.logs) continue
                    if (player.invTransfer(player.inv, slot, obj.count, bank).success) deposits++
                }
                mes(if (deposits > 0) "The leprechaun deposits your logs in your bank."
                    else "You have no logs to deposit or your bank is full.")
            }
            role == "trap" && e.type == ForestryEventType.FOX -> {
                if (!e.trapActive) return
                removeTrap(e)
                reward(e, c, 10.0 + player.woodcuttingLvl)
                statAdvance("stat.hunter", if (c.eligible) 18.0 else 1.0)
                mes("You disarm the fox trap.")
            }
            role == "forester" && e.type == ForestryEventType.PHEASANT -> {
                if (!c.egg) mes("Bring me an egg from an unguarded pheasant nest.")
                else if (clock.cycle - c.lastRound > 16) {
                    c.egg = false
                    mes("The pheasant caught you with its egg!")
                } else {
                    c.egg = false
                    reward(e, c, 14.0 + player.woodcuttingLvl)
                    statAdvance("stat.thieving", if (c.eligible) 20.0 else 1.0)
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
    fun eventLocNames(): List<String> {
        val labels = listOf("Tree roots", "Struggling sapling", "Droppings", "Green leaves",
            "Rotting leaves", "Splintered bark", "Wild mushrooms", "End of Rainbow",
            "Unfinished beehive", "Ritual circle", "Pheasant nest")
        return labels.mapNotNull { locType(it)?.internalName }.distinct()
    }
    fun eventNpcNames(): List<String> {
        val labels = listOf("Entling", "Flowering bush", "Woodcutting Leprechaun", "Bee keeper",
            "Frightened Fox", "Poacher", "Fox trap", "Dryad", "Freaky Forester", "Pheasant")
        val specials = ServerCacheManager.getNpcs().values.filter {
            normalized(it.name).startsWith("flowering bush") ||
                it.internalName.startsWith("npc.gathering_event_enchanted_ritual_") ||
                normalized(it.name) == "unfinished beehive"
        }.map { it.internalName }
        return (labels.mapNotNull { npcType(it)?.internalName } + specials).distinct()
    }
}

class ForestryEventScript @Inject constructor(
    private val events: ForestryEventManager,
) : PluginScript() {
    override fun ScriptContext.startup() {
        onEvent<GameLifecycle.LateCycle> { events.tick() }
        for (loc in events.eventLocNames()) {
            onOpLoc1(loc) { with(events) { interactLoc(it.loc) } }
        }
        for (npc in events.eventNpcNames()) {
            onOpNpc1(npc) { with(events) { interactNpc(it.npc, 1) } }
            onOpNpc2(npc) { with(events) { interactNpc(it.npc, 2) } }
            onOpNpc3(npc) { with(events) { interactNpc(it.npc, 3) } }
        }
    }
}
