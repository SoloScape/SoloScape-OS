package org.rsmod.content.other.bots

import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlin.math.abs
import kotlin.random.Random
import org.rsmod.api.area.checker.AreaChecker
import org.rsmod.api.area.checker.wildernessLevel
import org.rsmod.api.player.isInCombat
import org.rsmod.api.player.isValidTarget
import org.rsmod.api.player.isInPvpCombat
import org.rsmod.api.player.protect.clearPendingAction
import org.rsmod.api.player.stat.PlayerSkillXP
import org.rsmod.api.player.stat.baseHitpointsLvl
import org.rsmod.api.player.stat.hitpoints
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player
import org.rsmod.game.interact.InteractionPlayerOp
import org.rsmod.game.interact.InteractionPlayerT
import org.rsmod.game.stat.PlayerSkillXPTable
import org.rsmod.map.CoordGrid
import org.rsmod.routefinder.RouteFinding
import org.rsmod.routefinder.collision.CollisionFlagMap

@Singleton
class BotPvpCombat @Inject constructor(
    private val native: BotPvpActions,
    private val movement: BotActions,
    private val teams: BotMinigames,
    private val areas: AreaChecker,
    private val events: EventBus,
    collision: CollisionFlagMap,
) {
    private class WildernessSquad(
        val members: MutableList<Player>,
        var leader: Player,
        val home: CoordGrid,
    )

    private val states = LinkedHashMap<Player, BotPvpState>()
    private val squads = LinkedHashMap<Player, WildernessSquad>()
    /** Opt-in human-led teams are separate from bot-only Wilderness squads. */
    private val playerLeaders = LinkedHashMap<Player, Player>()
    private val random = Random.Default
    private val routeFinding = RouteFinding(collision)

    /**
     * Pick a tile that is both inside the Wilderness and genuinely pathable from the hotspot's
     * known-good anchor. This prevents synthetic players from being created on islands, inside
     * scenery, or behind collision that they can never escape.
     */
    fun spawnPoint(hotspot: BotPvpHotspot): CoordGrid =
        reachablePoint(hotspot.anchor, hotspot, maxDistance = 58, attempts = 96)
            ?: hotspot.anchor

    private fun reachableRoamPoint(
        source: CoordGrid,
        hotspot: BotPvpHotspot,
        multiwayOnly: Boolean = false,
    ): CoordGrid =
        reachablePoint(source, hotspot, maxDistance = 54, attempts = 64, multiwayOnly = multiwayOnly)
            ?: source

    /** Choose a reachable multi-combat tile before forming a Wilderness squad. */
    fun multiwaySpawnPoint(hotspot: BotPvpHotspot): CoordGrid? {
        val anchor = hotspot.anchor
        val candidates = sequence {
            yield(anchor)
            repeat(96) { yield(hotspot.roam(random)) }
        }
        return candidates.firstOrNull { candidate ->
            candidate.wildernessLevel(areas) > 0 &&
                areas.inArea("area.multiway", candidate) &&
                anchor.chebyshevDistance(candidate) <= 58 &&
                (candidate == anchor || routeFinding.findRoute(
                    level = anchor.level,
                    srcX = anchor.x,
                    srcZ = anchor.z,
                    destX = candidate.x,
                    destZ = candidate.z,
                    moveNear = false,
                ).success)
        }
    }

    /** Start squadmates alongside their leader, never on an unreachable or single-way tile. */
    fun squadSpawnPoint(leader: CoordGrid, hotspot: BotPvpHotspot): CoordGrid {
        repeat(48) {
            val candidate = CoordGrid(
                leader.x + random.nextInt(-3, 4),
                leader.z + random.nextInt(-3, 4),
                leader.level,
            )
            if (candidate == leader || !hotspot.contains(candidate) ||
                candidate.wildernessLevel(areas) <= 0 ||
                !areas.inArea("area.multiway", candidate)
            ) return@repeat
            val route = routeFinding.findRoute(
                level = leader.level,
                srcX = leader.x,
                srcZ = leader.z,
                destX = candidate.x,
                destZ = candidate.z,
                moveNear = false,
            )
            if (route.success) return candidate
        }
        return leader
    }

    private fun reachablePoint(
        source: CoordGrid,
        hotspot: BotPvpHotspot,
        maxDistance: Int,
        attempts: Int,
        multiwayOnly: Boolean = false,
    ): CoordGrid? {
        repeat(attempts) {
            val candidate = hotspot.roam(random)
            if (candidate.wildernessLevel(areas) <= 0 ||
                (multiwayOnly && !areas.inArea("area.multiway", candidate))
            ) return@repeat
            if (source.level != candidate.level ||
                source.chebyshevDistance(candidate) > maxDistance
            ) return@repeat
            val route = routeFinding.findRoute(
                level = source.level,
                srcX = source.x,
                srcZ = source.z,
                destX = candidate.x,
                destZ = candidate.z,
                moveNear = false,
            )
            if (route.success) return candidate
        }
        return null
    }

    fun register(
        player: Player,
        identity: Int,
        difficulty: BotPvpDifficulty,
        hotspotId: String? = null,
    ): Boolean {
        val selected = BotPvpLoadouts.choose(identity, player.members, difficulty, hotspotId)
        val risk = BotPvpRiskLoadouts.assignment(difficulty, selected)
        val scaled = BotPvpLevelScaling.scale(
            selected,
            identity,
            minimumPrayer = if (risk.usesProtectItem) 25 else 1,
        )
        val geared = BotPvpRiskGearOverlay.apply(scaled, risk)
        val supplied = BotPvpRiskSupplyOverlay.apply(geared, risk)
        val loadout = BotPvpEquipmentBudget.sanitize(supplied)
        val state = BotPvpState(
            BotPvpProfiles.get(difficulty, risk.role),
            loadout,
            hotspotId,
            risk,
            identity,
        )
        for ((stat, level) in loadout.levels) {
            player.statMap.setFineXP(stat, PlayerSkillXPTable.getFineXPFromLevel(level))
            player.statMap.setBaseLevel(stat, level.toByte())
            player.statMap.setCurrentLevel(stat, level.toByte())
        }
        player.appearance.combatLevel = PlayerSkillXP.calculateCombatLevel(player)
        val seedFailure = native.seedFailure(player, loadout)
        check(seedFailure == null) {
            "Unable to seed PvP bot loadout ${loadout.id}: $seedFailure"
        }
        VarPlayerIntMapSetter.set(player, "varp.sa_energy", 1000)
        configureRiskBehavior(player, state)
        states[player] = state
        return true
    }

    fun registerSquad(members: List<Player>, home: CoordGrid) {
        require(members.size in 2..4 && members.distinct().size == members.size)
        require(members.all { it in states && it !in squads })
        val squad = WildernessSquad(members.toMutableList(), members.first(), home)
        for (member in members) squads[member] = squad
    }

    fun inWilderness(player: Player): Boolean =
        player.isValidTarget() && player.coords.wildernessLevel(areas) > 0

    fun hasPlayerFollower(leader: Player): Boolean = playerLeaders.containsValue(leader)

    fun canOfferPlayerTeam(bot: Player): Boolean {
        val state = states[bot] ?: return false
        return bot !in squads && bot !in playerLeaders && inWilderness(bot) &&
            !bot.isInCombat() && !bot.isDelayed && !bot.isAccessProtected &&
            state.target == null && !state.dead && !state.returning &&
            state.retreatStartedAt < 0 && state.restockAt < 0
    }

    fun joinPlayerTeam(bot: Player, leader: Player): Boolean {
        if (!canOfferPlayerTeam(bot) || !inWilderness(leader) ||
            hasPlayerFollower(leader) || bot === leader
        ) return false
        val state = states.getValue(bot)
        disengage(bot, state)
        state.returning = false
        playerLeaders[bot] = leader
        // Native auto-retaliation must not override the player's chosen target or attack the
        // leader by mistake. The bot controller still retaliates through legal PvP attacks.
        VarPlayerIntMapSetter.set(bot, "varp.option_nodef", 1)
        return true
    }

    fun leavePlayerTeam(bot: Player) {
        if (playerLeaders.remove(bot) == null) return
        states[bot]?.let { disengage(bot, it) }
        VarPlayerIntMapSetter.set(bot, "varp.option_nodef", 0)
    }

    fun remove(player: Player) {
        leavePlayerTeam(player)
        states.remove(player)
        val squad = squads.remove(player) ?: return
        squad.members.remove(player)
        if (squad.members.size < 2) {
            squad.members.forEach { squads.remove(it) }
        } else if (squad.leader === player) {
            squad.leader = squad.members.first()
        }
    }

    private fun activeLeader(squad: WildernessSquad): Player? {
        fun available(member: Player): Boolean {
            val state = states[member] ?: return false
            return member.isValidTarget() && state.retreatStartedAt < 0 &&
                state.restockAt < 0 && areas.inArea("area.multiway", member.coords)
        }
        if (available(squad.leader)) return squad.leader
        val replacement = squad.members.firstOrNull(::available) ?: return null
        squad.leader = replacement
        return replacement
    }

    fun description(player: Player): String = states[player]?.let {
        "${it.profile.id}/${it.loadout.id}[${it.risk.tier}/${it.risk.role}]" +
            (it.hotspotId?.let { hotspot -> "@$hotspot" } ?: "") +
            (squads[player]?.let { squad ->
                " [squad ${squad.members.size} ${if (activeLeader(squad) === player) "leader" else "member"}]"
            } ?: "") +
            (playerLeaders[player]?.let { " [following ${it.displayName}]" } ?: "")
    } ?: ""

    fun riskTier(player: Player): BotPvpRiskTier? = states[player]?.risk?.tier

    fun recoverStuck(player: Player, hotspot: BotPvpHotspot): Boolean {
        if (player.isInCombat() || player.isDelayed || player.isAccessProtected) return false
        states[player]?.let { disengage(player, it) }
        val squad = squads[player]
        val leader = squad?.let(::activeLeader)
        val destination = when {
            squad == null -> spawnPoint(hotspot)
            leader != null && leader !== player &&
                areas.inArea("area.multiway", leader.coords) ->
                squadSpawnPoint(leader.coords, hotspot)
            else -> multiwaySpawnPoint(hotspot) ?: squad.home
        }
        return native.relocate(player, destination)
    }

    fun canUseHotspot(player: Player, hotspotId: String): Boolean = states[player]?.let { state ->
        BotPvpHotspots.get(hotspotId)?.allowedProfiles?.contains(state.profile.id) == true &&
            BotPvpLoadouts.allowedAt(state.loadout.id, hotspotId)
    } == true

    fun tick(
        player: Player,
        opponents: List<Player>,
        wilderness: Boolean,
        patrol: CoordGrid,
        waitingForTeamReply: Boolean = false,
    ): String {
        val state = states[player] ?: return "unconfigured"
        val cycle = player.currentMapClock
        val previousLeader = playerLeaders[player]
        if (previousLeader != null &&
            (!inWilderness(previousLeader) || !inWilderness(player))
        ) {
            leavePlayerTeam(player)
        }
        if (player.hitpoints <= 0) {
            state.dead = true
            disengage(player, state)
            return "dead"
        }
        if (player.isDelayed || player.isAccessProtected) return "busy"
        if (state.risk.usesProtectItem) {
            native.protectItem(player, enabled = true)
        }
        if (state.dead) {
            state.dead = false
            state.returning = true
            state.restockAt = cycle + 10
        }
        if (state.restockAt >= 0) {
            if (cycle < state.restockAt || player.isInCombat()) return "restocking"
            if (wilderness && player.coords.wildernessLevel(areas) > 0) {
                state.retreatStartedAt = cycle
                state.restockAt = -1
            } else {
                if (!native.seed(player, state.loadout)) return "waiting for supplies"
                configureRiskBehavior(player, state)
                state.style = state.loadout.primaryStyle
                state.reaction.reset()
                state.restockAt = -1
                state.retreatStartedAt = -1
                state.returning = if (wilderness) {
                    val squad = squads[player]
                    val leader = squad?.let(::activeLeader)
                    val hotspot = BotPvpHotspots.get(state.hotspotId)
                    val destination = when {
                        squad == null -> hotspot?.let(::spawnPoint) ?: patrol
                        hotspot != null && leader != null && leader !== player &&
                            areas.inArea("area.multiway", leader.coords) ->
                            squadSpawnPoint(leader.coords, hotspot)
                        else -> squad.home
                    }
                    !native.relocate(player, destination)
                } else {
                    true
                }
            }
        }
        val food = native.foodCount(player)
        if (cycle >= state.nextSupport) {
            if (BotPvpPolicy.shouldEat(player.hitpoints, player.baseHitpointsLvl,
                    state.profile.eatAtHpRatio)) {
                val panicHp =
                    player.hitpoints <= player.baseHitpointsLvl * state.profile.eatAtHpRatio * 0.55
                val triple = panicHp && state.profile.tripleEatChance > 0.0 &&
                    native.canTripleEat(player) &&
                    random.nextDouble() < state.profile.tripleEatChance
                val combo = triple || (
                    random.nextDouble() < state.profile.comboEatChance &&
                        player.hitpoints <=
                            player.baseHitpointsLvl * state.profile.eatAtHpRatio * 0.72
                    )
                if (native.eat(player, combo = combo, triple = triple)) {
                    state.nextSupport = cycle + 1
                    return if (triple) "triple eating" else "eating"
                }
            }
            if (native.drink(player, restore = true)) {
                state.nextSupport = cycle + 2
                return "restoring"
            }
            if (native.drink(player, restore = false)) {
                state.nextSupport = cycle + 2
                return "boosting"
            }
            state.nextSupport = cycle + 1
        }
        if (wilderness && (state.retreatStartedAt >= 0 ||
                BotPvpPolicy.shouldRetreat(player.hitpoints, player.baseHitpointsLvl,
                    food, state.profile))) {
            return retreat(player, state, cycle)
        }
        val squad = if (wilderness) squads[player] else null
        val leader = squad?.let(::activeLeader)
        val playerLeader = if (wilderness) playerLeaders[player] else null
        val returnTo = when {
            playerLeader != null -> playerLeader.coords
            leader != null && leader !== player &&
                areas.inArea("area.multiway", leader.coords) -> leader.coords
            else -> squad?.home ?: patrol
        }
        if (state.returning) {
            if (player.coords.chebyshevDistance(returnTo) <= 7) state.returning = false
            else {
                if (!player.frozen && cycle >= state.nextMove) {
                    walkTowards(player, returnTo)
                    state.nextMove = cycle + 3
                }
                return "returning to Wilderness"
            }
        }

        val eligible = opponents.filter { opponent ->
            val retaliating = isAttacking(player, opponent)
            val committed = state.target === opponent
            val range = BotPvpPolicy.engagementRange(
                state.profile.chaseDistanceTiles,
                retaliating || committed || squad != null || playerLeader != null,
            )
            val defendingLeader = playerLeader != null &&
                isAttacking(playerLeader, opponent)
            val supportingLeader = playerLeader != null &&
                isAttacking(opponent, playerLeader)
            opponent !== player && opponent !== playerLeader &&
                !teams.allied(player, opponent) &&
                (playerLeader == null || defendingLeader || supportingLeader || retaliating) &&
                (!waitingForTeamReply || retaliating) &&
                BotPvpPolicy.canSquadEngage(
                    hasSquad = squad != null,
                    squadmate = squad?.members?.contains(opponent) == true,
                    attackerInMultiway = areas.inArea("area.multiway", player.coords),
                    targetInMultiway = areas.inArea("area.multiway", opponent.coords),
                ) &&
                native.validTarget(player, opponent) &&
                player.coords.chebyshevDistance(opponent.coords) <= range &&
                (opponent in states || retaliating || squad != null ||
                    !areas.inArea("area.multiway", opponent.coords) || committed ||
                    states.values.count { bot -> bot.target === opponent } < 2)
        }
        val current = state.target
        if (current != null && current !in eligible) disengage(player, state)
        if (cycle >= state.nextTargetReview || state.target == null ||
            squad != null || playerLeader != null) {
            val indices = eligible.indices.toList()
            val retaliation = eligible.indices.filter {
                isAttacking(player, eligible[it])
            }.toSet()
            // Any attack on a squadmate takes priority; otherwise adopt the leader's
            // target so followers never pick unrelated fights in multi-combat.
            val sharedThreat = squad?.members?.asSequence()?.filter { it.isValidTarget() }
                ?.flatMap { member ->
                    eligible.asSequence().filter { isAttacking(member, it) }
                }?.firstOrNull()
            val groupFocus = squad?.let { group ->
                sequenceOf(group.leader).plus(group.members.asSequence())
                    .mapNotNull { states[it]?.target }
                    .firstOrNull { it in eligible }
            }
            val humanTeamTarget = playerLeader?.let { human ->
                eligible.firstOrNull { isAttacking(human, it) }
                    ?: eligible.firstOrNull { isAttacking(it, human) }
                    ?: eligible.firstOrNull { isAttacking(player, it) }
            }
            val selected = if (playerLeader != null) {
                humanTeamTarget
            } else if (waitingForTeamReply) {
                eligible.firstOrNull { isAttacking(player, it) }
            } else {
                sharedThreat ?: groupFocus ?: BotPvpPolicy.chooseTarget(
                    indices, eligible.indexOf(state.target).takeIf { it >= 0 }, retaliation,
                    { player.coords.chebyshevDistance(eligible[it].coords) },
                    { targetIndex -> states.values.count { it.target === eligible[targetIndex] } },
                    { targetIndex ->
                        if (state.risk.preferUnskulled &&
                            eligible[targetIndex].skullIcon != null
                        ) 12 else 0
                    },
                )?.let { eligible[it] }
            }
            if (selected !== state.target) {
                state.target = selected
                state.reaction.reset()
                state.nextPrayerReview = cycle
            }
            state.nextTargetReview = next(cycle, state.profile.targetReview)
        }
        val target = state.target
        if (target == null) {
            native.clearPrayers(player)
            if (playerLeader != null) {
                if (player.coords.chebyshevDistance(playerLeader.coords) > 2 &&
                    cycle >= state.nextMove && !player.frozen) {
                    walkTowards(player, playerLeader.coords)
                    state.nextMove = cycle + 2
                }
                return "following ${playerLeader.displayName}"
            }
            if (waitingForTeamReply) return "awaiting team reply"
            if (leader != null && leader !== player) {
                if (player.coords.chebyshevDistance(leader.coords) > 3 &&
                    cycle >= state.nextMove && !player.frozen) {
                    walkTowards(player, leader.coords)
                    state.nextMove = cycle + 2
                }
                return "following squad leader"
            }
            if (cycle >= state.nextMove && !player.frozen && player.routeRequest == null) {
                val dest = roamDestination(player, state, patrol)
                walkTowards(player, dest)
                state.nextMove = cycle + 5
            }
            return "seeking opponent"
        }
        val targetStyle = state.reaction.observe(native.styleOf(target), cycle,
            random.nextInt(state.profile.targetStyleReaction.first,
                state.profile.targetStyleReaction.last + 1))
        if (cycle >= state.nextPrayerReview) {
            if (state.profile.confidenceTier >= 3 &&
                    target.hitpoints.toDouble() / target.baseHitpointsLvl < 0.35 &&
                    random.nextDouble() < state.profile.smiteUseChance) native.smite(player)
            else native.pray(player, targetStyle)
            state.nextPrayerReview = next(cycle, state.profile.prayerReview)
        }

        if (state.specialQueuedAt >= 0) {
            val attacked = BotPvpPolicy.specialConsumed(state.energyAtSpec, native.specialEnergy(player))
            // TSPS keeps the spec weapon visible for roughly 0.7-1.3s after a one-tick activation.
            val oneTickHold = state.instantSpecialQueued && cycle - state.specialQueuedAt < 2
            if ((attacked && !oneTickHold) || cycle - state.specialQueuedAt >= 5) {
                native.cancelSpecial(player)
                native.equip(player, state.loadout.styles.getValue(state.returnStyle))
                state.style = state.returnStyle
                state.specialQueuedAt = -1
                state.instantSpecialQueued = false
                state.nextSpecReview = next(cycle, state.profile.specReview)
            } else {
                if (!state.instantSpecialQueued) native.attack(player, target)
                return "special attack"
            }
        }

        val distance = player.coords.chebyshevDistance(target.coords)
        val pressure = player.actionDelay <= cycle + 1 &&
            random.nextDouble() < state.profile.nextHitScriptChance
        if (cycle >= state.nextCombatAction || pressure) {
            val usable = state.loadout.styles.keys.filter {
                it != BotPvpStyle.Magic || state.loadout.attackSpell?.let { spell ->
                    native.canCast(player, spell)
                } == true
            }.toSet()
            val best = BotPvpPolicy.chooseStyle(
                usable.ifEmpty { setOf(state.style) }, state.style, native.protection(target),
                player.frozen, target.frozen, distance, random.nextDouble(),
            )
            if (best != state.style && random.nextDouble() <
                    (if (pressure) state.profile.nextHitStyleSwitchChance else state.profile.switchChance) &&
                    native.equip(player, state.loadout.styles.getValue(best))) {
                state.style = best
            }
            native.prayOffensive(player, state.style)
            state.nextCombatAction = next(cycle, state.profile.combatAction)
        }

        // TSPS one-tick path: veteran/elite only, attack-ready within two ticks, melee range,
        // dedicated cooldown/chance, then equip + activate Granite Maul without reissuing attack.
        // SoloScape's G-maul special owns its queued blows, so the combat-interface event must be
        // allowed to execute before switching back to the primary style.
        val oneTickWeapon = "obj.granite_maul"
        val committed = (player.interaction as? InteractionPlayerOp)?.target === target
        if (state.profile.confidenceTier >= 3 && oneTickWeapon in state.loadout.specialWeapons &&
                cycle >= state.nextOneTickCheck &&
                cycle - state.lastOneTickAt >= state.profile.oneTickCooldown &&
                player.actionDelay <= cycle + 2 && committed && distance <= 1) {
            state.nextOneTickCheck = cycle + 1
            val maxHit = native.estimatedMaxHit(player, target, BotPvpStyle.Melee, null)
            val chance = minOf(0.98, state.profile.oneTickUseChance + state.profile.oneTickGmaulChance)
            if (BotPvpPolicy.shouldSpec(
                    target.hitpoints, target.baseHitpointsLvl, maxHit,
                    native.specialEnergy(player), native.specialCost(oneTickWeapon), state.profile,
                    random.nextDouble(),
                ) && random.nextDouble() <= maxOf(0.05, chance)) {
                state.returnStyle = state.style
                if (native.equip(player, listOf(oneTickWeapon))) {
                    val energyBefore = native.specialEnergy(player)
                    if (native.special(player)) {
                        state.specialQueuedAt = cycle
                        state.energyAtSpec = energyBefore
                        state.instantSpecialQueued = true
                        state.lastOneTickAt = cycle
                        state.nextSpecReview = next(cycle, state.profile.specReview)
                        return "one-tick G-maul combo"
                    }
                    native.equip(player, state.loadout.styles.getValue(state.returnStyle))
                }
            }
        }

        if (cycle >= state.nextSpecReview && state.loadout.specialWeapons.isNotEmpty()) {
            state.nextSpecReview = next(cycle, state.profile.specReview)
            val finisher = state.loadout.specialWeapons.random(random)
            val maxHit = native.estimatedMaxHit(player, target, state.style, state.loadout.attackSpell)
            if (BotPvpPolicy.shouldSpec(
                    target.hitpoints, target.baseHitpointsLvl, maxHit,
                    native.specialEnergy(player), native.specialCost(finisher), state.profile,
                    random.nextDouble(),
                ) && !(player.frozen && distance > 1) &&
                    random.nextDouble() < state.profile.specSwitchChance &&
                    native.equip(player, listOf(finisher))) {
                state.returnStyle = state.style
                val energyBefore = native.specialEnergy(player)
                if (native.special(player)) {
                    state.specialQueuedAt = cycle
                    state.energyAtSpec = energyBefore
                    state.instantSpecialQueued = finisher == oneTickWeapon
                    if (!state.instantSpecialQueued) native.attack(player, target)
                    return "special attack"
                }
                native.equip(player, state.loadout.styles.getValue(state.returnStyle))
            }
        }

        val freeze = state.loadout.freezeSpell
        if (player.actionDelay <= cycle && distance <= 10 &&
                cycle >= state.nextFreezeReview && freeze != null && !target.frozen &&
                !target.freezeImmune && native.canCast(player, freeze)) {
            state.nextFreezeReview = next(cycle, state.profile.freezeReview)
            if (random.nextDouble() <
                    (if (pressure) state.profile.nextHitFreezeChance else state.profile.freezeUseChance) &&
                    native.equip(player, state.loadout.styles.getValue(BotPvpStyle.Magic))) {
                state.style = BotPvpStyle.Magic
                native.prayOffensive(player, state.style)
                native.attack(player, target, freeze)
                return "freezing"
            }
        }
        if (state.loadout.vengeance && cycle >= state.nextVengeance &&
                native.canCast(player, "obj.94_vengeance")) {
            state.nextVengeance = cycle + 50
            if (random.nextDouble() < vengeanceChance(state.profile.id) &&
                    native.vengeance(player)) return "casting Vengeance"
        }
        if (!player.frozen && cycle >= state.nextMove && target.frozen &&
                player.actionDelay > cycle + 1 &&
                random.nextDouble() < state.profile.combatMoveChance) {
            val underneath = state.style != BotPvpStyle.Melee && distance <= 1 &&
                random.nextDouble() < state.profile.freezeFollowUpChance
            val dest = if (underneath) target.coords else CoordGrid(
                target.coords.x + if (player.coords.x >= target.coords.x) 3 else -3,
                target.coords.z + if (player.coords.z >= target.coords.z) 2 else -2,
                target.coords.level,
            )
            movement.walk(player, dest)
            state.nextMove = cycle + 2
            return if (underneath) "stepping underneath" else "kiting"
        }
        if (player.coords == state.lastCoords) state.stationary++ else state.stationary = 0
        state.lastCoords = player.coords
        if (state.stationary >= 6 && distance > 1 && !player.frozen) {
            state.stationary = 0
            if (movement.operate(player, setOf("Door", "Gate"), "Open", 2)) return "opening gate"
        }
        native.attack(
            player, target,
            if (state.style == BotPvpStyle.Magic) state.loadout.attackSpell?.takeIf {
                native.canCast(player, it)
            } else null,
        )
        return "fighting ${target.displayName} (${state.style})"
    }

    private fun isAttacking(defender: Player, opponent: Player): Boolean {
        val activelyTargeting = when (val action = opponent.interaction) {
            is InteractionPlayerOp -> action.target === defender
            is InteractionPlayerT -> action.target === defender
            else -> false
        }
        val recentAttacker = defender.isInPvpCombat() &&
            defender.vars["varp.pk_predator1"] == opponent.uid.packed
        return activelyTargeting || recentAttacker
    }

    private fun roamDestination(
        player: Player,
        state: BotPvpState,
        patrol: CoordGrid,
    ): CoordGrid {
        val hotspot = BotPvpHotspots.get(state.hotspotId) ?: return CoordGrid(
            patrol.x + random.nextInt(-7, 8),
            patrol.z + random.nextInt(-7, 8),
            patrol.level,
        )
        if (squads[player] != null) {
            // Squad leaders roam inside multiway; followers trail them instead of scattering.
            return reachableRoamPoint(player.coords, hotspot, multiwayOnly = true)
        }
        if (hotspot.fixedHotspot) return reachableRoamPoint(player.coords, hotspot)

        var target = BotPvpHotspots.patrolTarget(state.identity, state.patrolStep)
        if (player.coords.chebyshevDistance(target) <= 14) {
            state.patrolStep++
            target = BotPvpHotspots.patrolTarget(state.identity, state.patrolStep)
        }
        val patrolStep = reachablePatrolStep(player.coords, target)
        if (patrolStep != null) return patrolStep

        // Do not let one obstructed sector pin a bot forever; advance its patrol sequence and
        // take a safe local step before trying the next cross-Wilderness target.
        state.patrolStep++
        return reachableRoamPoint(player.coords, hotspot)
    }

    /**
     * Advance toward a far-away Wilderness patrol target in short collision-validated hops.
     * Different bots have different target sequences, so these hops continuously fill the spaces
     * between activity hotspots instead of leaving permanent dead bands on the map.
     */
    private fun reachablePatrolStep(source: CoordGrid, target: CoordGrid): CoordGrid? {
        val dx = target.x - source.x
        val dz = target.z - source.z
        val distance = maxOf(abs(dx), abs(dz))
        if (distance == 0) return source
        val step = minOf(46, distance)
        val projectedX = source.x + (dx * step / distance)
        val projectedZ = source.z + (dz * step / distance)

        repeat(36) { attempt ->
            val jitter = if (attempt == 0) 0 else 10
            val candidate = CoordGrid(
                projectedX + if (jitter == 0) 0 else random.nextInt(-jitter, jitter + 1),
                projectedZ + if (jitter == 0) 0 else random.nextInt(-jitter, jitter + 1),
                source.level,
            )
            if (candidate.wildernessLevel(areas) <= 0 ||
                source.chebyshevDistance(candidate) > 54
            ) return@repeat
            val route = routeFinding.findRoute(
                level = source.level,
                srcX = source.x,
                srcZ = source.z,
                destX = candidate.x,
                destZ = candidate.z,
                moveNear = false,
            )
            if (route.success) return candidate
        }
        return null
    }

    private fun retreat(player: Player, state: BotPvpState, cycle: Int): String {
        if (state.retreatStartedAt < 0) {
            state.retreatStartedAt = cycle
            disengage(player, state)
            VarPlayerIntMapSetter.set(player, "varp.option_nodef", 1)
        }
        if (player.coords.wildernessLevel(areas) <= 0 && !player.isInCombat()) {
            state.restockAt = cycle + 10
            state.retreatStartedAt = -1
            VarPlayerIntMapSetter.set(player, "varp.option_nodef", 0)
            return "restocking"
        }
        if (cycle - state.retreatStartedAt >= 9 && cycle >= state.nextMove && native.teleport(player)) {
            state.nextMove = cycle + 5
            return "teleporting away"
        }
        if (!player.frozen && cycle >= state.nextMove) {
            val south = CoordGrid(player.coords.x, maxOf(3518, player.coords.z - 12), player.coords.level)
            walkTowards(player, if (south == player.coords) CoordGrid(3087, 3518) else south)
            state.nextMove = cycle + 3
        }
        return "retreating"
    }

    private fun disengage(player: Player, state: BotPvpState) {
        if (!player.isDelayed && !player.isAccessProtected) {
            player.clearPendingAction(events)
            native.cancelSpecial(player)
        }
        state.target = null
        state.specialQueuedAt = -1
        state.instantSpecialQueued = false
        state.reaction.reset()
    }

    private fun walkTowards(player: Player, destination: CoordGrid) {
        if (player.coords.level == 0 && destination.level == 0 &&
                BotPvpPolicy.crossesDitch(player.coords.z, destination.z) &&
                movement.operate(
                    player, setOf("loc.ditch_wilderness_cover", "loc.ditch_wilderness_cover_members"),
                    "Cross", 3,
                )) return
        val next = if (player.coords.chebyshevDistance(destination) <= 48) destination
            else BotRoutes.path(player.coords, destination).firstOrNull() ?: CoordGrid(
                player.coords.x + (destination.x - player.coords.x).coerceIn(-32, 32),
                player.coords.z + (destination.z - player.coords.z).coerceIn(-32, 32),
                player.coords.level,
            )
        movement.walk(player, next)
    }

    private fun configureRiskBehavior(player: Player, state: BotPvpState) {
        // Wilderness population bots are active PKers: they must be able to initiate on legal
        // targets instead of circling each other while skull prevention rejects every first hit.
        // Risk tier still controls equipment, supplies and Protect Item behaviour.
        state.preventSkull = false
        native.setSkullPrevention(player, enabled = false)
        native.protectItem(player, enabled = state.risk.usesProtectItem)
    }

    private fun next(cycle: Int, range: IntRange): Int =
        BotPvpPolicy.nextReview(cycle, range, random)

    private fun vengeanceChance(difficulty: BotPvpDifficulty): Double = when (difficulty) {
        BotPvpDifficulty.Novice -> 0.34
        BotPvpDifficulty.Standard -> 0.56
        BotPvpDifficulty.Veteran -> 0.78
        BotPvpDifficulty.Elite -> 0.92
    }
}
