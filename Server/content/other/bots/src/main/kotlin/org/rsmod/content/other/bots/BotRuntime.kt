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
import org.rsmod.game.interact.InteractionLocOp
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
    val identity: Int,
    val personality: BotPersonality = BotHumanity.personality(identity),
    var patrol: CoordGrid? = null,
    val hotspot: BotPvpHotspot? = null,
) {
    var phase = BotPhase.Outbound
    var path = task.route
    var pathOrigin = task.start
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
    var resourceWaits = 0
    var returnReason: String? = null
    var onlineSince = 0
    var sessionEndAt = Int.MAX_VALUE
    var nextPauseAt = Int.MAX_VALUE
    var pauseUntil = 0
    var nextAmbientAt = Int.MAX_VALUE
    var friendIdentity: Int? = null
    val protectedTimeout = BotProgressTimeout()
    val blockedTasks = mutableMapOf<String, Int>()
}

private class PendingWildernessSquad(
    val hotspot: BotPvpHotspot,
    val home: CoordGrid,
    val difficulty: BotPvpDifficulty,
    val size: Int,
) {
    val members = mutableListOf<Player>()
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
    private data class PlayerTeamInvitation(val player: Player, val expiresAt: Int)
    private data class DeclinedPlayerTeam(val player: Player, val expiresAt: Int)
    private val playerTeamInvitations = LinkedHashMap<Player, PlayerTeamInvitation>()
    private val declinedPlayerTeams = HashMap<Player, DeclinedPlayerTeam>()
    private val nextPlayerTeamOffer = HashMap<Player, Int>()
    private val nextOfferToPlayer = HashMap<Player, Int>()
    private var nextIdentity = 1
    private var nextPvpPopulationIndex = 1
    private val desiredPopulation = linkedMapOf<BotMode, Int>()
    private val restingIdentities = mutableMapOf<BotMode, java.util.ArrayDeque<Int>>()
    private var nextPopulationSweep = 0
    private val configured = Properties().apply {
        val config = Path.of(".data", "bots.properties")
        if (!Files.exists(config)) {
            Files.createDirectories(config.parent)
            val defaults = checkNotNull(BotPopulation::class.java.getResourceAsStream("/bots.properties"))
            defaults.use { Files.copy(it, config) }
        }
        Files.newInputStream(config).use { load(it) }
    }
    private val debugMap = BotDebugMap()
    private val debugger = BotDebugger()

    fun debug(enabled: Boolean): String {
        actions.debugEnabled = enabled
        if (enabled) debugger.start() else debugger.stop()
        if (!enabled) debugMap.diagnostics("{\"enabled\":false,\"bots\":[]}")
        val port = configured.getProperty("debug.map.port", "7071")
        return if (enabled) "Bot debugger enabled: build/bot-debug/snapshot.json; browser http://127.0.0.1:$port/debug"
            else "Bot debugger stopped; last snapshot retained."
    }
    val count: Int get() = bots.size + minigames.count
    fun players(): List<Player> = bots.keys.toList()
    fun isBot(player: Player): Boolean = player in bots
    fun isPvpBot(player: Player): Boolean = bots[player]?.mode?.isPvp == true

    /**
     * Only the specific player offered a Wilderness team can accept or reject it.
     * An unrelated chat "yes" or "no" does not join anyone.
     */
    fun hearPlayerTeamReply(player: Player, message: String, cycle: Int): Boolean {
        val accepted = BotPvpPolicy.playerTeamReply(message) ?: return false
        val invitation = playerTeamInvitations.entries.firstOrNull {
            it.value.player === player
        } ?: return false
        val bot = invitation.key
        playerTeamInvitations.remove(bot)
        if (!accepted) {
            bot.say("No worries.")
            declinedPlayerTeams[bot] = DeclinedPlayerTeam(
                player, cycle + PLAYER_TEAM_DECLINE_COOLDOWN,
            )
            nextPlayerTeamOffer[bot] = cycle + PLAYER_TEAM_DECLINE_COOLDOWN
            nextOfferToPlayer[player] = cycle + PLAYER_TEAM_DECLINE_COOLDOWN
            return true
        }
        val valid = cycle <= invitation.value.expiresAt &&
            pvpCombat.inWilderness(player) && player.coords.level == bot.coords.level &&
            player.coords.chebyshevDistance(bot.coords) <= PLAYER_TEAM_INVITE_DISTANCE
        if (valid && pvpCombat.joinPlayerTeam(bot, player)) {
            bot.say("Okay, I'll follow you!")
        } else {
            bot.say("Maybe another time.")
        }
        return true
    }

    private fun expirePlayerTeamInvitations(cycle: Int) {
        playerTeamInvitations.entries.removeAll { (bot, invite) ->
            cycle > invite.expiresAt ||
                !pvpCombat.canOfferPlayerTeam(bot) ||
                !pvpCombat.inWilderness(invite.player) ||
                invite.player.coords.level != bot.coords.level ||
                invite.player.coords.chebyshevDistance(bot.coords) > PLAYER_TEAM_INVITE_DISTANCE
        }
        declinedPlayerTeams.entries.removeAll { (bot, ignored) ->
            !bot.isSlotAssigned || !ignored.player.isSlotAssigned ||
                cycle >= ignored.expiresAt
        }
        nextPlayerTeamOffer.keys.removeIf { !it.isSlotAssigned }
        nextOfferToPlayer.keys.removeIf { !it.isSlotAssigned }
    }

    private fun offerWildernessTeam(bot: Player, cycle: Int) {
        if (bot in playerTeamInvitations || !pvpCombat.canOfferPlayerTeam(bot) ||
            cycle < (nextPlayerTeamOffer[bot] ?: 0)
        ) return
        nextPlayerTeamOffer[bot] = cycle + PLAYER_TEAM_OFFER_INTERVAL
        val chance = configured.getProperty("pvp.player-team.chance", "0.15")
            .toDoubleOrNull()?.coerceIn(0.0, 1.0) ?: 0.15
        if (random.nextDouble() >= chance) return
        val candidate = registry.playerList.mapNotNull { it }.filter { player ->
            player !in bots && pvpCombat.inWilderness(player) &&
                !pvpCombat.hasPlayerFollower(player) &&
                playerTeamInvitations.values.none { it.player === player } &&
                cycle >= (nextOfferToPlayer[player] ?: 0) &&
                player.coords.level == bot.coords.level &&
                player.coords.chebyshevDistance(bot.coords) <= PLAYER_TEAM_INVITE_DISTANCE
        }.minByOrNull { it.coords.chebyshevDistance(bot.coords) } ?: return
        playerTeamInvitations[bot] = PlayerTeamInvitation(
            candidate, cycle + PLAYER_TEAM_INVITE_DURATION,
        )
        nextOfferToPlayer[candidate] = cycle + PLAYER_TEAM_OFFER_INTERVAL
        bot.clearPendingAction(events)
        bot.say("Team?")
    }

    private val humanBehaviourEnabled: Boolean
        get() = configured.getProperty("human.behaviour.enabled", "true").toBoolean()
    private val humanPopulationEnabled: Boolean
        get() = configured.getProperty("human.population.enabled", "true").toBoolean()

    fun startup() {
        if (!configured.getProperty("enabled", "false").toBoolean()) return
        if (configured.getProperty("debug.map.enabled", "true").toBoolean()) {
            val port = configured.getProperty("debug.map.port", "7071").toIntOrNull() ?: 7071
            debugMap.start(port.coerceIn(1, 65535))
        }
        for (mode in BotMode.entries) {
            val count = (configured.getProperty(mode.name.lowercase(), "0").toIntOrNull() ?: 0)
                .coerceIn(0, MAX_BOTS)
            desiredPopulation[mode] = count
            // Keep PvP squads and trader/event controllers at their configured startup sizes.
            val stagger = humanPopulationEnabled && mode in setOf(BotMode.Skilling, BotMode.Progressive)
            spawn(mode, if (stagger) minOf(count, 3) else count)
        }
        updateDebugMap()
    }

    private fun spawn(mode: BotMode, requested: Int): Int {
        val difficultySetting = configured.getProperty("pvp.difficulty", "mixed")
        val membersWorld = configured.getProperty("members", "true").toBoolean()
        var added = 0
        val total = requested.coerceIn(0, MAX_BOTS - bots.size)
        val squadChance = configured.getProperty("pvp.teams.chance", "0.25")
            .toDoubleOrNull()?.coerceIn(0.0, 1.0) ?: 0.25
        var pendingSquad: PendingWildernessSquad? = null
        repeat(total) { index ->
            val slot = registry.nextFreeSlot() ?: return added
            if (registry.count() >= MAX_BOTS) return added
            val identity = freeIdentity(mode)
            val difficulty = if (mode.isPvp) {
                BotPvpDifficulty.configured(difficultySetting, nextPvpPopulationIndex)
                    ?: BotPvpDifficulty.Standard
            } else {
                BotPvpDifficulty.Standard
            }
            val name = SourceBotCatalog.names[(identity - 1) % SourceBotCatalog.names.size]
            val initial = initialTask(mode) ?: return added
            val occupancy = if (mode == BotMode.Wilderness) {
                bots.values.asSequence()
                    .filter { it.mode == BotMode.Wilderness }
                    .mapNotNull { it.hotspot?.id }
                    .groupingBy { it }
                    .eachCount()
            } else emptyMap()
            if (mode == BotMode.Wilderness && pendingSquad == null &&
                total - index >= 2 && random.nextDouble() < squadChance) {
                val size = BotPvpPolicy.squadSize(
                    remaining = total - index,
                    sizeRoll = random.nextInt(minOf(3, total - index - 1)),
                )
                val candidates = BotPvpHotspots.available(membersWorld, difficulty)
                    .filter { !it.fixedHotspot ||
                        occupancy.getOrDefault(it.id, 0) + size <= it.maxBots }
                    .sortedBy { occupancy.getOrDefault(it.id, 0) }
                val location = candidates.firstNotNullOfOrNull { candidate ->
                    pvpCombat.multiwaySpawnPoint(candidate)?.let { candidate to it }
                }
                if (location != null) {
                    pendingSquad = PendingWildernessSquad(
                        location.first, location.second, difficulty, size,
                    )
                }
            }
            val selectedSquad = pendingSquad
            val effectiveDifficulty = selectedSquad?.difficulty ?: difficulty
            val hotspot = if (mode == BotMode.Wilderness) {
                selectedSquad?.hotspot ?: BotPvpHotspots.choose(
                    identity, membersWorld, effectiveDifficulty, occupancy,
                )
            } else null
            val patrol = selectedSquad?.home ?: hotspot?.anchor
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
                    BotMode.Wilderness -> when {
                        selectedSquad == null -> pvpCombat.spawnPoint(checkNotNull(hotspot))
                        selectedSquad.members.isEmpty() -> selectedSquad.home
                        else -> pvpCombat.squadSpawnPoint(
                            selectedSquad.members.first().coords, checkNotNull(hotspot),
                        )
                    }
                    BotMode.ClanOne -> CoordGrid(3217, 3682)
                    BotMode.ClanTwo -> CoordGrid(3232, 3682)
                    BotMode.Skilling, BotMode.Progressive ->
                        actions.spawnPoint(initial.start) ?: return added
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
                if (mode in setOf(BotMode.Skilling, BotMode.Progressive)) {
                    BotAppearance.assign(player.appearance, identity)
                }
                initializeLevels(player, mode, initial)
                if (mode.isPvp) {
                    check(pvpCombat.register(player, identity, effectiveDifficulty, hotspot?.id)) {
                        "Unable to seed PvP bot loadout"
                    }
                } else supplies.seed(player, initial, mode == BotMode.Progressive)
                val restoredTask = if (mode in setOf(BotMode.Progressive, BotMode.Skilling))
                    profiles.load(player) else null
                val task = SourceBotCatalog.tasks.firstOrNull { it.id == restoredTask } ?: initial
                val bot = WorldBot(player, mode, task, identity, patrol = patrol, hotspot = hotspot)
                val now = player.currentMapClock
                bot.onlineSince = now
                bot.sessionEndAt = now + BotHumanity.sessionCycles(bot.personality, random)
                bot.nextPauseAt = now + BotHumanity.nextPauseCycles(bot.personality, random)
                bot.nextAmbientAt = now + random.nextInt(400, 900)
                if (mode in setOf(BotMode.Skilling, BotMode.Progressive) &&
                    random.nextInt(100) < 35) {
                    val candidates = bots.values.filter { it.mode == mode &&
                        it.task.kind == task.kind && it.friendIdentity == null }
                    candidates.randomOrNull(random)?.let { friend ->
                        bot.friendIdentity = friend.identity
                        friend.friendIdentity = identity
                    }
                }
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
                if (mode in setOf(BotMode.Skilling, BotMode.Progressive)) {
                    bot.nextThink = player.currentMapClock + random.nextInt(1, 15)
                }
                player.rebuildAppearance()
                added++
                if (mode.isPvp) nextPvpPopulationIndex++
                if (selectedSquad != null) {
                    selectedSquad.members += player
                    if (selectedSquad.members.size == selectedSquad.size) {
                        pvpCombat.registerSquad(selectedSquad.members, selectedSquad.home)
                        pendingSquad = null
                    }
                }
            } catch (error: Exception) {
                logger.error(error) { "Could not initialize bot $name" }
                bots.remove(player)
                pvpCombat.remove(player)
                registry.del(player)
                sessions.detach(player)
                // A failed spawn must not leave a squad waiting indefinitely for a member.
                if (selectedSquad != null) {
                    if (selectedSquad.members.size >= 2) {
                        pvpCombat.registerSquad(selectedSquad.members, selectedSquad.home)
                    }
                    pendingSquad = null
                }
            }
        }
        return added
    }

    private fun freeIdentity(mode: BotMode): Int {
        val queue = restingIdentities[mode]
        while (queue != null && queue.isNotEmpty()) {
            val identity = queue.removeFirst()
            val name = SourceBotCatalog.names[(identity - 1) % SourceBotCatalog.names.size]
            if (registry.playerList.none { it?.username == "worldbot_$identity" ||
                it?.displayName?.equals(name, true) == true }) return identity
        }
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
        } else if (mode == BotMode.Skilling) {
            val occupancy = bots.values.groupingBy { it.task.id }.eachCount()
            BotTaskPlanner.selectBalanced(all, occupancy, random)
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
            val level = if (mode == BotMode.Skilling && bare == task.skill) {
                base.coerceIn(task.minimumLevel, task.maximumLevel)
            } else base.coerceIn(1, 99)
            player.statMap.setFineXP(skill, PlayerSkillXPTable.getFineXPFromLevel(level))
            player.statMap.setBaseLevel(skill, level.toByte())
            player.statMap.setCurrentLevel(skill, level.toByte())
        }
        player.appearance.combatLevel = PlayerSkillXP.calculateCombatLevel(player)
    }

    private fun setTask(bot: WorldBot, task: BotTaskDefinition) {
        actions.release(bot.player)
        bot.task = task
        bot.path = task.route
        bot.pathOrigin = task.start
        bot.waypoint = 0
        bot.phase = BotPhase.Outbound
        bot.startedAt = bot.player.currentMapClock
        bot.expiresAt = bot.startedAt + if (humanBehaviourEnabled &&
            bot.mode in setOf(BotMode.Skilling, BotMode.Progressive)) {
            BotHumanity.workingCycles(bot.personality, random)
        } else random.nextInt(30, 90) * 100
        bot.milestone = task.skill?.let {
            BotTaskPlanner.nextMilestone(it, BotSkills.levels(bot.player)[it] ?: 1)
        } ?: 99
        bot.stalled = 0
        bot.recoveries = 0
        bot.status = "walking to ${task.id}"
        bot.resourceWaits = 0
        bot.returnReason = null
    }

    private fun chooseTask(bot: WorldBot) {
        val player = bot.player
        val occupancy = bots.values.filter { it !== bot }.groupingBy { it.task.id }.eachCount()
        bot.blockedTasks.entries.removeAll { it.value <= player.currentMapClock }
        val expandedKinds = setOf(BotTaskKind.Mining, BotTaskKind.Fishing,
            BotTaskKind.Woodcutting, BotTaskKind.Cooking, BotTaskKind.Smelting,
            BotTaskKind.Smithing, BotTaskKind.Crafting, BotTaskKind.Spinning)
        val basicKinds = setOf(BotTaskKind.Mining, BotTaskKind.Fishing, BotTaskKind.Woodcutting)
        val availableKinds = if (configured.getProperty("human.routines.expanded", "true")
            .toBoolean()) expandedKinds else basicKinds
        val levels = BotSkills.levels(player)
        val candidates = SourceBotCatalog.tasks.filter {
            (if (bot.mode == BotMode.Skilling) {
                it.kind in availableKinds && BotTaskPlanner.available(it, levels, player.members)
            } else it.kind !in setOf(BotTaskKind.Trade, BotTaskKind.DropParty)) &&
                supplies.canSupply(player, it) && it.id !in bot.blockedTasks
        }
        val friendTask = bots.values.firstOrNull { it.identity == bot.friendIdentity }?.task
        val next = if (humanBehaviourEnabled) {
            BotHumanity.chooseTask(candidates.filter {
                bot.mode != BotMode.Progressive ||
                    BotTaskPlanner.available(it, levels, player.members)
            }, occupancy, bot.personality, random, bot.task, friendTask)
        } else if (bot.mode == BotMode.Skilling) {
            BotTaskPlanner.selectBalanced(candidates.filter { it.id != bot.task.id }, occupancy, random)
                ?: BotTaskPlanner.selectBalanced(candidates, occupancy, random)
        } else BotTaskPlanner.select(candidates, levels, player.members, occupancy, random)
        if (next == null) {
            bot.status = "waiting for supplies"
            bot.nextThink = player.currentMapClock + 50
            return
        }
        setTask(bot, next)
        bot.needsPlan = false
        bot.path = BotRoutes.path(player.coords, next.start, actions::canWalk)
        bot.pathOrigin = player.coords
        bot.waypoint = 0
        bot.phase = if (player.coords.level == next.start.level &&
            player.coords.chebyshevDistance(next.start) <= 2) BotPhase.Banking else BotPhase.Changing
    }

    fun tick(cycle: Int) {
        reconcilePopulation(cycle)
        expirePlayerTeamInvitations(cycle)
        for (bot in bots.values.toList()) {
            val player = bot.player
            if (!player.isSlotAssigned) {
                remove(player)
                continue
            }
            if (bot.mode.isPvp) {
                if (bot.mode == BotMode.Wilderness) offerWildernessTeam(player, cycle)
                pvp(bot)
                continue
            }
            if (cycle < bot.nextThink) continue
            bot.nextThink = cycle + 3
            if (player.hitpoints <= 0) {
                actions.release(player)
                continue
            }
            val totalXp = BotSkills.all.sumOf { player.statMap.getFineXP(it).toLong() }
            val timedOut = bot.protectedTimeout.expired(cycle, player.coords, totalXp,
                player.isDelayed || player.isAccessProtected)
            if (timedOut && !player.isDelayed) {
                player.clearPendingAction(events)
                actions.release(player)
                bot.protectedTimeout.expired(cycle, player.coords, totalXp, false)
                bot.stalled = 0
                bot.returnReason = "Protected action made no movement or XP progress for 120 seconds"
                bot.status = "cancelled stalled protected action"
                continue
            }
            if (menus.tick(player)) continue
            if (player.isDelayed || player.isAccessProtected) continue
            if (cycle % 100 < 3 && bot.mode == BotMode.Progressive) save(bot)
            if (eat(player)) continue
            if (bot.mode in setOf(BotMode.Skilling, BotMode.Progressive, BotMode.Combat)) {
                // All conversational replies are delivered through BotSocial, including skillers.
                social.tick(player, "skilling", cycle)
                if (bot.mode != BotMode.Combat && humanBehaviourEnabled &&
                    tickHumanBehaviour(bot, cycle)) continue
            }
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
        updateDebugMap()
        updateDiagnostics(cycle)
    }

    /** Stagger arrivals and retire one settled character at a time. No PvP squad churn. */
    private fun reconcilePopulation(cycle: Int) {
        if (!humanPopulationEnabled || cycle < nextPopulationSweep) return
        nextPopulationSweep = cycle + random.nextInt(50, 110)
        for (mode in listOf(BotMode.Skilling, BotMode.Progressive)) {
            val target = desiredPopulation[mode] ?: continue
            val living = bots.values.count { it.mode == mode }
            if (living < target) {
                spawn(mode, minOf(2, target - living))
            } else if (target > 3) {
                val retiring = bots.values.firstOrNull { bot ->
                    bot.mode == mode && cycle >= bot.sessionEndAt &&
                        bot.player.hitpoints > 0 && !bot.player.isDelayed &&
                        !bot.player.isAccessProtected && bot.player.interaction == null &&
                        bot.player.routeRequest == null
                }
                if (retiring != null) remove(retiring.player)
            }
        }
    }

    /** Leave any native pending interaction alone; these are intentional idle decisions. */
    private fun tickHumanBehaviour(bot: WorldBot, cycle: Int): Boolean {
        val player = bot.player
        if (cycle < bot.pauseUntil) {
            bot.status = "taking a short break"
            return true
        }
        if (cycle >= bot.nextAmbientAt) {
            bot.nextAmbientAt = cycle + random.nextInt(700, 1700)
            val nearHuman = registry.playerList.any { other ->
                other != null && other !== player && other !in bots &&
                    other.coords.level == player.coords.level &&
                    other.coords.chebyshevDistance(player.coords) <= 8
            }
            if (nearHuman && random.nextInt(100) < bot.personality.sociability / 3) {
                player.say(BotHumanity.ambientLine(bot.task.kind, random))
            }
        }
        if (cycle >= bot.nextPauseAt && bot.phase in setOf(BotPhase.Working, BotPhase.Banking) &&
            player.interaction == null && player.routeRequest == null) {
            bot.pauseUntil = cycle + BotHumanity.pauseCycles(bot.personality, random)
            bot.nextPauseAt = cycle + BotHumanity.nextPauseCycles(bot.personality, random)
            bot.status = "taking a short break"
            return true
        }
        return false
    }

    private fun updateDiagnostics(cycle: Int) {
        if (!debugger.enabled) return
        val rows = bots.values.map { bot ->
            val player = bot.player
            mapOf<String, Any?>("name" to player.displayName, "mode" to bot.mode.name,
                "task" to bot.task.id, "phase" to bot.phase.name, "status" to bot.status,
                "position" to "${player.coords.x},${player.coords.z},${player.coords.level}",
                "waypoint" to bot.waypoint, "waypointCount" to bot.path.size,
                "target" to bot.path.getOrNull(bot.waypoint)?.toString(),
                "routeSteps" to player.routeDestination.size,
                "interaction" to player.interaction?.javaClass?.simpleName,
                "delayed" to player.isDelayed, "protected" to player.isAccessProtected,
                "inventoryUsed" to player.inv.objs.count { it != null },
                "totalXp" to BotSkills.all.sumOf { player.statMap.getFineXP(it).toLong() },
                "resourceWaits" to bot.resourceWaits, "stallChecks" to bot.stalled,
                "recoveries" to bot.recoveries, "returnReason" to bot.returnReason,
                "personality" to bot.personality.summary, "friendIdentity" to bot.friendIdentity,
                "pauseUntil" to bot.pauseUntil, "nextPauseAt" to bot.nextPauseAt,
                "sessionEndAt" to bot.sessionEndAt,
                "selection" to actions.selectionTrace(player))
        }
        debugger.snapshot(cycle, rows)?.let(debugMap::diagnostics)
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
        val status = pvpCombat.tick(
            player,
            opponents,
            wilderness,
            bot.patrol ?: CoordGrid(3224, 3682),
            waitingForTeamReply = player in playerTeamInvitations,
            declinedPlayer = declinedPlayerTeams[player]?.player,
        )
        bot.status = status
        if (wilderness) watchPvpStall(bot, status)
    }

    private fun watchPvpStall(bot: WorldBot, status: String) {
        val player = bot.player
        val movingState = status == "seeking opponent" ||
            status == "following squad leader" || status == "returning to Wilderness"
        if (!movingState || player.coords != bot.previousCoords) {
            bot.stalled = 0
        } else {
            bot.stalled++
        }
        bot.previousCoords = player.coords
        if (bot.stalled < 20) return

        val hotspot = bot.hotspot ?: return
        if (pvpCombat.recoverStuck(player, hotspot)) {
            bot.stalled = 0
            bot.status = "recovering from blocked Wilderness tile"
        }
    }

    private fun think(bot: WorldBot, cycle: Int) {
        val player = bot.player
        when (bot.phase) {
            BotPhase.Changing, BotPhase.Outbound, BotPhase.Returning -> walkRoute(bot)
            BotPhase.Banking -> {
                val keep = supplies.requirements(bot.task, BotSkills.levels(player) +
                    ("members" to if (player.members) 1 else 0)).keys
                    .filter { item -> listOf("axe", "rod", "net", "hammer", "needle", "talisman")
                        .any { item.contains(it, ignoreCase = true) } || item.equals("Coins", true) }
                    .toSet()
                if (!actions.bank(player, keep)) return
                if (bot.mode in setOf(BotMode.Progressive, BotMode.Skilling) && bot.needsPlan) {
                    if (bot.mode == BotMode.Progressive) save(bot)
                    chooseTask(bot)
                    if (bot.phase == BotPhase.Changing) return
                }
                if (supplies.replenish(player, bot.task, actions)) {
                    bot.phase = BotPhase.Outbound
                    bot.path = bot.task.route
                    bot.pathOrigin = bot.task.start
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
                if (cycle >= bot.expiresAt || full || bot.resourceWaits >= 10 ||
                    (bot.mode == BotMode.Progressive && level >= bot.milestone) ||
                    !supplies.canSupply(player, bot.task)
                ) {
                    bot.returnReason = when {
                        full -> "Inventory full"
                        bot.resourceWaits >= 10 -> "Ten resource-selection failures"
                        cycle >= bot.expiresAt -> "Activity timer expired"
                        bot.mode == BotMode.Progressive && level >= bot.milestone -> "Training milestone reached"
                        else -> "Required supplies unavailable"
                    }
                    player.clearPendingAction(events)
                    actions.release(player)
                    bot.path = bot.task.route.asReversed() + bot.task.start
                    bot.pathOrigin = player.coords
                    bot.waypoint = 0
                    bot.phase = BotPhase.Returning
                    bot.needsPlan = true
                    bot.status = "returning to bank"
                    return
                }
                if (player.interaction != null || player.routeRequest != null) {
                    if (bot.task.kind == BotTaskKind.Woodcutting) {
                        (player.interaction as? InteractionLocOp)?.let { player.faceLoc(it.target) }
                    }
                    watchStall(bot)
                    return
                }
                if (bot.task.kind == BotTaskKind.Combat &&
                    actions.pickup(player, 6, bot.task.ignoredLoot)) return
                if (!supplies.perform(player, bot.task, actions,
                    radius = (12 + bot.resourceWaits * 2).coerceAtMost(32))) {
                    val exclusive = bot.task.kind in setOf(
                        BotTaskKind.Mining, BotTaskKind.Fishing, BotTaskKind.Woodcutting,
                    )
                    if (exclusive) {
                        bot.resourceWaits++
                        bot.status = "waiting for a free resource at ${bot.task.id}"
                        bot.nextThink = cycle + 10
                        return
                    }
                }
                bot.resourceWaits = 0
                bot.status = "working ${bot.task.id}"
            }
        }
        watchStall(bot)
    }

    private fun walkRoute(bot: WorldBot) {
        val player = bot.player
        if (bot.path.isEmpty() && bot.phase in setOf(BotPhase.Changing, BotPhase.Returning)) {
            if (player.coords.level != bot.task.start.level ||
                player.coords.chebyshevDistance(bot.task.start) > 2) {
                recover(bot)
                return
            }
        }
        while (bot.waypoint < bot.path.size) {
            val target = bot.path[bot.waypoint]
            if (BotRoutes.reached(bot.pathOrigin, bot.path, bot.waypoint, player.coords)) {
                bot.waypoint++
                continue
            }
            if (player.routeRequest != null && bot.stalled < 3) return
            val previous = bot.path.getOrNull(bot.waypoint - 1) ?: bot.pathOrigin
            val transition = BotRoutes.traversal(previous, target)
            if (transition != null && player.coords == previous) {
                if (actions.canWalk(player.coords, target)) {
                    actions.walk(player, target)
                    return
                }
                if (transition.item != null) {
                    actions.useItemOnLoc(player, transition.item, transition.targets)
                } else actions.operate(player, transition.targets, transition.option, radius = 2)
                return
            }
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
            val walked = actions.walk(player, target,
                spread = bot.mode in setOf(BotMode.Skilling, BotMode.Progressive) &&
                    !BotRoutes.exactWaypoint(bot.pathOrigin, bot.path, bot.waypoint))
            if (!walked && bot.stalled == 3) {
                val detour = BotRoutes.path(player.coords, target, actions::canWalk)
                if (detour.isNotEmpty()) {
                    bot.path = detour + bot.path.drop(bot.waypoint + 1)
                    bot.pathOrigin = player.coords
                    bot.waypoint = 0
                    bot.status = "rerouting around blocked waypoint"
                    return
                }
            }
            if (!walked && bot.stalled in setOf(3, 9)) {
                actions.operate(player, setOf("Door", "Gate"), "Open", 2)
            }
            return
        }
        when (bot.phase) {
            BotPhase.Returning -> bot.phase = BotPhase.Banking
            BotPhase.Changing -> {
                bot.phase = BotPhase.Banking
                bot.path = bot.task.route
                bot.pathOrigin = bot.task.start
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
        bot.returnReason = "Movement or XP stalled (${bot.stalled} checks)"
        actions.release(player)
        player.clearPendingAction(events)
        if (bot.recoveries++ < 2) {
            bot.path = BotRoutes.path(player.coords, bot.task.start, actions::canWalk)
            bot.pathOrigin = player.coords
            bot.phase = BotPhase.Returning
            bot.needsPlan = true
            bot.waypoint = 0
            bot.stalled = 0
            bot.status = if (bot.path.isEmpty() &&
                (player.coords.level != bot.task.start.level ||
                    player.coords.chebyshevDistance(bot.task.start) > 2)) {
                "waiting for a walkable bank route"
            } else "walking to bank after stall"
            bot.nextThink = player.currentMapClock + 10
        } else {
            bot.recoveries = 0
            if (bot.mode in setOf(BotMode.Skilling, BotMode.Progressive)) {
                bot.blockedTasks[bot.task.id] = player.currentMapClock + 1000
                chooseTask(bot)
            } else bot.status = "stalled: ${bot.task.id}"
            bot.nextThink = player.currentMapClock + 100
        }
    }

    fun describe(): List<String> = bots.values.map {
        "${it.player.displayName} ${it.mode} ${pvpCombat.description(it.player)}: ${it.status} " +
            "(${it.player.coords.x},${it.player.coords.z},${it.player.coords.level}) " +
            "[${it.personality.summary}; friend=${it.friendIdentity ?: "none"}]"
    }

    fun removeAll() {
        bots.keys.toList().forEach(::remove)
        playerTeamInvitations.clear()
        declinedPlayerTeams.clear()
        nextPlayerTeamOffer.clear()
        nextOfferToPlayer.clear()
        minigames.removeAll()
        debugMap.stop()
        debugger.stop()
        actions.debugEnabled = false
    }

    private fun updateDebugMap() {
        val points = bots.values.asSequence()
            .filter { it.mode.isPvp }
            .map { bot ->
                val coords = bot.player.coords
                BotDebugPoint(
                    x = coords.x,
                    y = coords.z,
                    plane = coords.level,
                    tier = pvpCombat.riskTier(bot.player),
                )
            }
            .toList()
        debugMap.update(points)
    }

    private fun remove(player: Player) {
        actions.release(player)
        val bot = bots.remove(player)
        playerTeamInvitations.remove(player)
        declinedPlayerTeams.remove(player)
        if (bot?.mode in setOf(BotMode.Progressive, BotMode.Skilling)) {
            save(checkNotNull(bot))
            if (humanPopulationEnabled) {
                restingIdentities.getOrPut(bot.mode) { java.util.ArrayDeque() }.addLast(bot.identity)
            }
            bots.values.filter { it.friendIdentity == bot.identity }.forEach {
                it.friendIdentity = null
            }
        }
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

    companion object {
        const val MAX_BOTS = 1990
        private const val PLAYER_TEAM_INVITE_DISTANCE = 10
        private const val PLAYER_TEAM_INVITE_DURATION = 30
        private const val PLAYER_TEAM_OFFER_INTERVAL = 80
        private const val PLAYER_TEAM_DECLINE_COOLDOWN = 300
    }
}
