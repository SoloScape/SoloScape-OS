package org.rsmod.content.other.bots

import com.github.michaelbull.logging.InlineLogger
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.nio.file.Files
import java.nio.file.Path
import java.util.Properties
import kotlin.random.Random
import org.rsmod.api.net.rsprot.BotSessions
import org.rsmod.api.player.output.mes
import org.rsmod.api.player.protect.ProtectedAccessLauncher
import org.rsmod.api.player.protect.clearPendingAction
import org.rsmod.api.player.stat.PlayerSkillXP
import org.rsmod.api.player.stat.baseHitpointsLvl
import org.rsmod.api.player.stat.hitpoints
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.api.registry.player.PlayerRegistry
import org.rsmod.api.registry.player.isSuccess
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player
import org.rsmod.game.stat.PlayerSkillXPTable
import org.rsmod.map.CoordGrid

enum class BotMode {
    Skilling, Progressive, Combat, Wilderness, Trade, DropParty, ClanOne, ClanTwo;

    val isPvp: Boolean get() = this in setOf(Wilderness, ClanOne, ClanTwo)
    companion object {
        fun parse(text: String): BotMode? = entries.firstOrNull {
            it.name.equals(text.replace("_", "").replace("-", ""), true)
        } ?: when (text.lowercase()) {
            "wildy" -> Wilderness
            "clana" -> ClanOne
            "clanb" -> ClanTwo
            else -> null
        }
    }
}

private enum class BotPhase { Outbound, Working, Returning, Banking, Changing }

private class WorldBot(
    val player: Player,
    val mode: BotMode,
    var task: BotTaskDefinition,
    var patrol: CoordGrid? = null,
    val hotspot: BotPvpHotspot? = null,
) {
    var phase = BotPhase.Outbound
    var path = task.route
    var waypoint = 0
    var startedAt = 0
    var expiresAt = 0
    var milestone = 99
    var nextThink = 0
    var previousCoords = player.coords
    var previousXP = 0L
    var stalled = 0
    var recoveries = 0
    var status = "starting"
    var needsPlan = true
}

@Singleton
class BotPopulation @Inject constructor(
    private val registry: PlayerRegistry,
    private val sessions: BotSessions,
    private val actions: BotActions,
    private val supplies: BotSupplies,
    private val menus: BotMenus,
    private val social: BotSocial,
    private val minigames: BotMinigames,
    private val access: ProtectedAccessLauncher,
    private val events: EventBus,
    private val pvpCombat: BotPvpCombat,
) {
    private val logger = InlineLogger()
    private val bots = LinkedHashMap<Player, WorldBot>()
    private val profiles = BotProfileStore()
    private val random = Random.Default
    private var nextIdentity = 1
    private val configured = Properties().apply {
        val config = Path.of(".data", "bots.properties")
        if (!Files.exists(config)) {
            Files.createDirectories(config.parent)
            val defaults = checkNotNull(BotPopulation::class.java.getResourceAsStream("/bots.properties"))
            defaults.use { Files.copy(it, config) }
        }
        Files.newInputStream(config).use { load(it) }
    }
    val count: Int get() = bots.size + minigames.count
    fun players(): List<Player> = bots.keys.toList()
    fun isBot(player: Player): Boolean = player in bots

    fun startup() {
        if (!configured.getProperty("enabled", "false").toBoolean()) return
        for (mode in BotMode.entries) {
            val count = configured.getProperty(mode.name.lowercase(), "0").toIntOrNull() ?: 0
            spawn(mode, count)
        }
    }

    private fun spawn(mode: BotMode, requested: Int): Int {
        val difficulty = BotPvpDifficulty.parse(
            configured.getProperty("pvp.difficulty", "standard")
        ) ?: BotPvpDifficulty.Standard
        val membersWorld = configured.getProperty("members", "true").toBoolean()
        var added = 0
        repeat(requested.coerceIn(0, MAX_BOTS - bots.size)) {
            val slot = registry.nextFreeSlot() ?: return added
            if (registry.count() >= MAX_BOTS) return added
            val identity = freeIdentity()
            val name = SourceBotCatalog.names[(identity - 1) % SourceBotCatalog.names.size]
            val initial = initialTask(mode) ?: return added
            val hotspot = if (mode == BotMode.Wilderness) {
                BotPvpHotspots.choose(identity, membersWorld, difficulty)
            } else null
            val patrol = hotspot?.anchor
            val player = Player().apply {
                accountId = 0
                characterId = 0
                val key = -2_000_000L - identity
                userId = key
                accountHash = key
                userHash = key
                uuid = key
                observerUUID = key
                username = "worldbot_$identity"
                displayName = name
                members = membersWorld
                slotId = slot
                coords = when (mode) {
                    BotMode.Wilderness -> checkNotNull(hotspot).spawn(random)
                    BotMode.ClanOne -> CoordGrid(3217, 3682)
                    BotMode.ClanTwo -> CoordGrid(3232, 3682)
                    else -> initial.start
                }
                runEnergy = 10000
            }
            sessions.attach(player)
            if (!registry.add(player).isSuccess()) {
                sessions.detach(player)
                return added
            }
            try {
                initializeLevels(player, mode, initial)
                if (mode.isPvp) {
                    check(pvpCombat.register(player, identity, difficulty, hotspot?.id)) {
                        "Unable to seed PvP bot loadout"
                    }
                } else supplies.seed(player, initial, mode == BotMode.Progressive)
                val restoredTask = if (mode == BotMode.Progressive) profiles.load(player) else null
                val task = SourceBotCatalog.tasks.firstOrNull { it.id == restoredTask } ?: initial
                val bot = WorldBot(player, mode, task, patrol, hotspot)
                bots[player] = bot
                if (mode == BotMode.Progressive) {
                    chooseTask(bot)
                } else {
                    setTask(bot, task)
                }
                if (mode == BotMode.Trade) social.configure(player, "trade")
                if (mode == BotMode.DropParty) {
                    social.configure(player, if (bots.values.count { it.mode == mode } % 10 == 1)
                        "drop-party-leader" else "drop-party-follower")
                }
                VarPlayerIntMapSetter.set(player, "varp.option_run", 1)
                player.rebuildAppearance()
                added++
            } catch (error: Exception) {
                logger.error(error) { "Could not initialize bot $name" }
                bots.remove(player)
                pvpCombat.remove(player)
                registry.del(player)
                sessions.detach(player)
            }
        }
        return added
    }

    private fun freeIdentity(): Int {
        while (true) {
            val id = nextIdentity++
            val name = SourceBotCatalog.names[(id - 1) % SourceBotCatalog.names.size]
            if (registry.playerList.none {
                it?.username == "worldbot_$id" || it?.displayName?.equals(name, true) == true
            }) return id
        }
    }

    private fun initialTask(mode: BotMode): BotTaskDefinition? {
        val kind = when (mode) {
            BotMode.Trade -> setOf(BotTaskKind.Trade)
            BotMode.DropParty -> setOf(BotTaskKind.DropParty)
            BotMode.Combat, BotMode.Wilderness, BotMode.ClanOne, BotMode.ClanTwo ->
                setOf(BotTaskKind.Combat)
            else -> setOf(BotTaskKind.Mining, BotTaskKind.Fishing, BotTaskKind.Woodcutting)
        }
        val all = SourceBotCatalog.tasks.filter { it.kind in kind &&
            (configured.getProperty("members", "true").toBoolean() || !it.members) }
        return if (mode == BotMode.Progressive) {
            all.firstOrNull { it.id == "DraynorTreeWoodcutting" }
        } else all.randomOrNull(random)
    }

    private fun initializeLevels(player: Player, mode: BotMode, task: BotTaskDefinition) {
        for (skill in BotSkills.all) {
            val bare = skill.removePrefix("stat.").let { if (it == "runecraft") "runecrafting" else it }
            val base = if (mode == BotMode.Progressive) {
                if (bare == "hitpoints") 10 else 1
            } else {
                maxOf(task.requiredLevels[bare] ?: 1,
                    if (bare == task.skill) task.minimumLevel else 1,
                    if (bare == "hitpoints") 30 else 1,
                    random.nextInt(30, 80))
            }
            val level = base.coerceIn(1, 99)
            player.statMap.setFineXP(skill, PlayerSkillXPTable.getFineXPFromLevel(level))
            player.statMap.setBaseLevel(skill, level.toByte())
            player.statMap.setCurrentLevel(skill, level.toByte())
        }
        player.appearance.combatLevel = PlayerSkillXP.calculateCombatLevel(player)
    }

    private fun setTask(bot: WorldBot, task: BotTaskDefinition) {
        bot.task = task
        bot.path = task.route
        bot.waypoint = 0
        bot.phase = BotPhase.Outbound
        bot.startedAt = bot.player.currentMapClock
        bot.expiresAt = bot.startedAt + random.nextInt(30, 90) * 100
        bot.milestone = task.skill?.let {
            BotTaskPlanner.nextMilestone(it, BotSkills.levels(bot.player)[it] ?: 1)
        } ?: 99
        bot.stalled = 0
        bot.status = "walking to ${task.id}"
    }

    private fun chooseTask(bot: WorldBot) {
        val player = bot.player
        val occupancy = bots.values.groupingBy { it.task.id }.eachCount()
        val candidates = SourceBotCatalog.tasks.filter {
            it.kind !in setOf(BotTaskKind.Trade, BotTaskKind.DropParty) &&
                supplies.canSupply(player, it)
        }
        val next = BotTaskPlanner.select(candidates, BotSkills.levels(player),
            player.members, occupancy, random)
        if (next == null) {
            bot.status = "waiting for supplies"
            bot.nextThink = player.currentMapClock + 50
            return
        }
        setTask(bot, next)
        bot.needsPlan = false
        bot.path = BotRoutes.path(player.coords, next.start)
        bot.waypoint = 0
        bot.phase = if (bot.path.isEmpty()) BotPhase.Banking else BotPhase.Changing
    }

    fun tick(cycle: Int) {
        for (bot in bots.values.toList()) {
            val player = bot.player
            if (!player.isSlotAssigned) {
                remove(player)
                continue
            }
            if (bot.mode.isPvp) {
                pvp(bot)
                continue
            }
            if (cycle < bot.nextThink) continue
            bot.nextThink = cycle + 3
            if (menus.tick(player)) continue
            if (player.isDelayed || player.isAccessProtected || player.hitpoints <= 0) continue
            if (cycle % 100 < 3 && bot.mode == BotMode.Progressive) save(bot)
            if (eat(player)) continue
            when (bot.mode) {
                BotMode.Trade, BotMode.DropParty -> {
                    social.tick(player, if (bot.mode == BotMode.Trade) "trade" else "dropparty", cycle)
                    continue
                }
                BotMode.Wilderness, BotMode.ClanOne, BotMode.ClanTwo -> {
                    pvp(bot)
                    continue
                }
                else -> {}
            }
            think(bot, cycle)
        }
    }

    private fun eat(player: Player): Boolean {
        if (player.hitpoints * 100 > player.baseHitpointsLvl * 45) return false
        val slot = player.inv.indices.firstOrNull { slot ->
            val obj = player.inv[slot] ?: return@firstOrNull false
            dev.openrune.ServerCacheManager.getItem(obj.id)?.interfaceOptions?.any {
                it.equals("Eat", true)
            } == true
        } ?: return false
        return actions.held(player, slot)
    }

    private fun pvp(bot: WorldBot) {
        val player = bot.player
        val wilderness = bot.mode == BotMode.Wilderness
        val opponents = if (wilderness) {
            val wildernessBots = bots.values
                .filter { it.mode == BotMode.Wilderness }
                .map { it.player }.filter { it !== player }
            val realPlayers = registry.playerList.mapNotNull { it }.filter {
                it !== player && it !in bots
            }
            wildernessBots + realPlayers
        } else {
            bots.values.filter {
                (bot.mode == BotMode.ClanOne && it.mode == BotMode.ClanTwo) ||
                    (bot.mode == BotMode.ClanTwo && it.mode == BotMode.ClanOne)
            }.map { it.player }.filter { it !== player }
        }
        bot.status = pvpCombat.tick(player, opponents, wilderness,
            bot.patrol ?: CoordGrid(3224, 3682))
    }

    private fun think(bot: WorldBot, cycle: Int) {
        val player = bot.player
        when (bot.phase) {
            BotPhase.Changing, BotPhase.Outbound, BotPhase.Returning -> walkRoute(bot)
            BotPhase.Banking -> {
                val keep = supplies.requirements(bot.task, BotSkills.levels(player)).keys
                    .filter { it.contains("axe") || it.contains("rod") || it.contains("net") ||
                        it.contains("hammer") || it.contains("needle") || it.contains("talisman") }
                    .toSet()
                if (!actions.bank(player, keep)) return
                if (bot.mode == BotMode.Progressive && bot.needsPlan) {
                    save(bot)
                    chooseTask(bot)
                    if (bot.phase == BotPhase.Changing) return
                }
                if (supplies.replenish(player, bot.task, actions)) {
                    bot.phase = BotPhase.Outbound
                    bot.path = bot.task.route
                    bot.waypoint = 0
                } else {
                    bot.status = "supplies exhausted"
                    bot.nextThink = cycle + 50
                }
            }
            BotPhase.Working -> {
                val level = bot.task.skill?.let { BotSkills.levels(player)[it] ?: 1 } ?: 1
                val gathering = bot.task.kind in setOf(BotTaskKind.Mining, BotTaskKind.Fishing,
                    BotTaskKind.Woodcutting, BotTaskKind.Shearing, BotTaskKind.Combat, BotTaskKind.MoneyMaking)
                val full = gathering && player.inv.indices.none { player.inv[it] == null }
                if (cycle >= bot.expiresAt || full ||
                    (bot.mode == BotMode.Progressive && level >= bot.milestone) ||
                    !supplies.canSupply(player, bot.task)
                ) {
                    player.clearPendingAction(events)
                    bot.path = bot.task.route.asReversed() + bot.task.start
                    bot.waypoint = 0
                    bot.phase = BotPhase.Returning
                    bot.needsPlan = true
                    bot.status = "returning to bank"
                    return
                }
                if (player.interaction != null || player.routeRequest != null) return
                if (bot.task.kind == BotTaskKind.Combat &&
                    actions.pickup(player, 6, bot.task.ignoredLoot)) return
                if (!supplies.perform(player, bot.task, actions)) {
                    actions.operate(player, bot.task.targets, bot.task.option)
                }
                bot.status = "working ${bot.task.id}"
            }
        }
        watchStall(bot)
    }

    private fun walkRoute(bot: WorldBot) {
        val player = bot.player
        while (bot.waypoint < bot.path.size) {
            val target = bot.path[bot.waypoint]
            if (player.coords.level == target.level && player.coords.chebyshevDistance(target) <= 2) {
                bot.waypoint++
                continue
            }
            if (player.routeRequest != null && bot.stalled < 3) return
            if (player.coords.level != target.level || player.coords.chebyshevDistance(target) > 64) {
                val transition = BotRoutes.traversal(player.coords, target)
                if (transition != null) {
                    if (transition.item != null) {
                        actions.useItemOnLoc(player, transition.item, transition.targets)
                    } else actions.operate(player, transition.targets, transition.option)
                    return
                }
                if (bot.stalled >= 5) recover(bot)
                return
            }
            if (bot.stalled >= 3 && actions.operate(player, setOf("Door", "Gate"), "Open", 2)) return
            actions.walk(player, target)
            return
        }
        when (bot.phase) {
            BotPhase.Returning -> bot.phase = BotPhase.Banking
            BotPhase.Changing -> {
                bot.phase = BotPhase.Banking
                bot.path = bot.task.route
                bot.waypoint = 0
            }
            else -> bot.phase = BotPhase.Working
        }
    }

    private fun watchStall(bot: WorldBot) {
        val player = bot.player
        val xp = BotSkills.all.sumOf { player.statMap.getFineXP(it).toLong() }
        if (player.coords == bot.previousCoords && xp == bot.previousXP) bot.stalled++
        else bot.stalled = 0
        bot.previousCoords = player.coords
        bot.previousXP = xp
        if (bot.stalled >= 20) recover(bot)
    }

    private fun recover(bot: WorldBot) {
        val player = bot.player
        if (bot.recoveries++ < 2) {
            player.clearPendingAction(events)
            access.launch(player) { telejump(bot.task.start) }
            bot.phase = BotPhase.Banking
            bot.waypoint = 0
            bot.stalled = 0
            bot.status = "recovering at bank"
        } else {
            bot.status = "stalled: ${bot.task.id}"
            bot.nextThink = player.currentMapClock + 100
            bot.recoveries = 0
        }
    }

    fun describe(): List<String> = bots.values.map {
        "${it.player.displayName} ${it.mode} ${pvpCombat.description(it.player)}: ${it.status} " +
            "(${it.player.coords.x},${it.player.coords.z},${it.player.coords.level})"
    }

    fun removeAll() {
        bots.keys.toList().forEach(::remove)
        minigames.removeAll()
    }

    private fun remove(player: Player) {
        val bot = bots.remove(player)
        if (bot?.mode == BotMode.Progressive) save(bot)
        pvpCombat.remove(player)
        social.remove(player)
        minigames.remove(player)
        player.clearPendingAction(events)
        if (player.isSlotAssigned) registry.del(player)
        sessions.detach(player)
    }

    private fun save(bot: WorldBot) {
        try { profiles.save(bot.player, bot.task.id) }
        catch (error: Exception) { logger.error(error) { "Could not save bot ${bot.player.username}" } }
    }

    companion object { const val MAX_BOTS = 1990 }
}
