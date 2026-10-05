package org.rsmod.content.other.bots

import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlin.random.Random
import org.rsmod.api.area.checker.AreaChecker
import org.rsmod.api.area.checker.wildernessLevel
import org.rsmod.api.player.isInCombat
import org.rsmod.api.player.protect.clearPendingAction
import org.rsmod.api.player.stat.PlayerSkillXP
import org.rsmod.api.player.stat.baseHitpointsLvl
import org.rsmod.api.player.stat.hitpoints
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player
import org.rsmod.game.interact.InteractionPlayerOp
import org.rsmod.game.stat.PlayerSkillXPTable
import org.rsmod.map.CoordGrid

@Singleton
class BotPvpCombat @Inject constructor(
    private val native: BotPvpActions,
    private val movement: BotActions,
    private val teams: BotMinigames,
    private val areas: AreaChecker,
    private val events: EventBus,
) {
    private val states = LinkedHashMap<Player, BotPvpState>()
    private val random = Random.Default

    fun register(
        player: Player,
        identity: Int,
        difficulty: BotPvpDifficulty,
        hotspotId: String? = null,
    ): Boolean {
        val loadout = BotPvpLoadouts.choose(identity, player.members, difficulty, hotspotId)
        val state = BotPvpState(BotPvpProfiles.get(difficulty), loadout, hotspotId)
        for ((stat, level) in loadout.levels) {
            player.statMap.setFineXP(stat, PlayerSkillXPTable.getFineXPFromLevel(level))
            player.statMap.setBaseLevel(stat, level.toByte())
            player.statMap.setCurrentLevel(stat, level.toByte())
        }
        player.appearance.combatLevel = PlayerSkillXP.calculateCombatLevel(player)
        if (!native.seed(player, loadout)) return false
        VarPlayerIntMapSetter.set(player, "varp.sa_energy", 1000)
        states[player] = state
        return true
    }

    fun remove(player: Player) {
        states.remove(player)
    }

    fun description(player: Player): String = states[player]?.let {
        "${it.profile.id}/${it.loadout.id}${it.hotspotId?.let { hotspot -> "@$hotspot" } ?: ""}"
    } ?: ""

    fun canUseHotspot(player: Player, hotspotId: String): Boolean = states[player]?.let { state ->
        BotPvpHotspots.get(hotspotId)?.allowedProfiles?.contains(state.profile.id) == true &&
            BotPvpLoadouts.allowedAt(state.loadout.id, hotspotId)
    } == true

    fun tick(
        player: Player,
        opponents: List<Player>,
        wilderness: Boolean,
        patrol: CoordGrid,
    ): String {
        val state = states[player] ?: return "unconfigured"
        val cycle = player.currentMapClock
        if (player.hitpoints <= 0) {
            state.dead = true
            disengage(player, state)
            return "dead"
        }
        if (player.isDelayed || player.isAccessProtected) return "busy"
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
                state.style = state.loadout.primaryStyle
                state.reaction.reset()
                state.restockAt = -1
                state.retreatStartedAt = -1
                state.returning = true
            }
        }
        val food = native.foodCount(player)
        if (cycle >= state.nextSupport) {
            if (BotPvpPolicy.shouldEat(player.hitpoints, player.baseHitpointsLvl,
                    state.profile.eatAtHpRatio)) {
                val combo = random.nextDouble() < state.profile.comboEatChance &&
                    player.hitpoints <= player.baseHitpointsLvl * state.profile.eatAtHpRatio * 0.72
                if (native.eat(player, combo)) {
                    state.nextSupport = cycle + 1
                    return "eating"
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
        if (state.returning) {
            if (player.coords.chebyshevDistance(patrol) <= 7) state.returning = false
            else {
                if (!player.frozen && cycle >= state.nextMove) {
                    walkTowards(player, patrol)
                    state.nextMove = cycle + 3
                }
                return "returning to Wilderness"
            }
        }

        val eligible = opponents.filter {
            it !== player && !teams.allied(player, it) && native.validTarget(player, it) &&
                player.coords.chebyshevDistance(it.coords) <= state.profile.chaseDistanceTiles &&
                (it in states || !areas.inArea("area.multiway", it.coords) ||
                    state.target === it || states.values.count { bot -> bot.target === it } < 2)
        }
        val current = state.target
        if (current != null && current !in eligible) disengage(player, state)
        if (cycle >= state.nextTargetReview || state.target == null) {
            val indices = eligible.indices.toList()
            val retaliation = eligible.indices.filter {
                (eligible[it].interaction as? InteractionPlayerOp)?.target === player
            }.toSet()
            val selected = BotPvpPolicy.chooseTarget(
                indices, eligible.indexOf(state.target).takeIf { it >= 0 }, retaliation,
                { player.coords.chebyshevDistance(eligible[it].coords) },
                { targetIndex -> states.values.count { it.target === eligible[targetIndex] } },
            )?.let { eligible[it] }
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
            if (cycle >= state.nextMove && !player.frozen && player.routeRequest == null) {
                val dest = BotPvpHotspots.get(state.hotspotId)?.spawn(random) ?: CoordGrid(
                    patrol.x + random.nextInt(-7, 8),
                    patrol.z + random.nextInt(-7, 8),
                    patrol.level,
                )
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

    private fun next(cycle: Int, range: IntRange): Int =
        BotPvpPolicy.nextReview(cycle, range, random)

    private fun vengeanceChance(difficulty: BotPvpDifficulty): Double = when (difficulty) {
        BotPvpDifficulty.Novice -> 0.34
        BotPvpDifficulty.Standard -> 0.56
        BotPvpDifficulty.Veteran -> 0.78
        BotPvpDifficulty.Elite -> 0.92
    }
}
