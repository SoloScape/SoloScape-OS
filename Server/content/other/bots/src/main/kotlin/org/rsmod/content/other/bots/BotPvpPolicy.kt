package org.rsmod.content.other.bots

import kotlin.random.Random

internal object BotPvpPolicy {
    fun chooseStyle(
        available: Set<BotPvpStyle>,
        current: BotPvpStyle,
        protection: BotPvpStyle?,
        frozen: Boolean,
        targetFrozen: Boolean,
        distance: Int,
        roll: Double,
    ): BotPvpStyle {
        require(available.isNotEmpty())
        return available.maxBy { style ->
            var score = if (style == current) 0.15 else 0.0
            if (style == protection) score -= 2.0
            if (style == BotPvpStyle.Melee && (frozen && distance > 1)) score -= 4.0
            if (style != BotPvpStyle.Melee && targetFrozen && distance > 1) score += 1.0
            if (style == BotPvpStyle.Melee && distance <= 1) score += 0.5
            score + ((roll * (style.ordinal + 1) * 7.0) % 1.0) * 0.1
        }
    }

    fun shouldEat(hp: Int, maximum: Int, threshold: Double): Boolean =
        hp > 0 && maximum > 0 && hp <= kotlin.math.ceil(maximum * threshold).toInt()

    fun shouldRetreat(hp: Int, maximum: Int, food: Int, profile: BotPvpProfile): Boolean =
        hp > 0 && maximum > 0 && food == 0 &&
            hp.toDouble() / maximum <= profile.retreatHpRatio

    fun shouldSpec(
        targetHp: Int,
        targetMaximum: Int,
        projectedMaxHit: Int,
        energy: Int,
        requiredEnergy: Int,
        profile: BotPvpProfile,
        roll: Double,
    ): Boolean = targetHp > 0 && targetMaximum > 0 && energy >= requiredEnergy &&
        roll < profile.specUseChance &&
        (targetHp <= kotlin.math.ceil(projectedMaxHit * 0.85).toInt() ||
            targetHp.toDouble() / targetMaximum <= profile.specPressureHpRatio)

    fun chooseTarget(
        candidates: List<Int>,
        current: Int?,
        retaliating: Set<Int>,
        distance: (Int) -> Int,
        attackers: (Int) -> Int,
        preferencePenalty: (Int) -> Int = { 0 },
    ): Int? = candidates.minByOrNull {
        distance(it) + attackers(it) * 12 + preferencePenalty(it) -
            (if (it == current) 20 else 0) - (if (it in retaliating) 40 else 0)
    }

    /** Only explicit yes/no replies to an outstanding invitation have meaning. */
    fun playerTeamReply(message: String): Boolean? = when (message.trim().lowercase()) {
        "yes" -> true
        "no" -> false
        else -> null
    }

    fun playerTeamActive(leaderInWilderness: Boolean, followerInWilderness: Boolean): Boolean =
        leaderInWilderness && followerInWilderness

    /** A rejected invitation is not permission to hunt that player. */
    fun canTargetDecliner(declined: Boolean, retaliating: Boolean): Boolean =
        !declined || retaliating

    /** One uniform roll across the sizes that fit the remaining Wilderness population. */
    fun squadSize(remaining: Int, sizeRoll: Int): Int {
        require(remaining >= 2)
        return 2 + sizeRoll.coerceIn(0, minOf(2, remaining - 2))
    }

    fun canSquadEngage(
        hasSquad: Boolean,
        squadmate: Boolean,
        attackerInMultiway: Boolean,
        targetInMultiway: Boolean,
    ): Boolean = !squadmate && (!hasSquad || (attackerInMultiway && targetInMultiway))

    fun engagementRange(chaseDistance: Int, retaliatingOrCommitted: Boolean): Int =
        if (retaliatingOrCommitted) maxOf(chaseDistance, 32) else chaseDistance

    fun shouldPreventSkull(risk: BotPvpRiskAssignment, roll: Double): Boolean =
        roll < risk.skullPreventionChance

    fun specialConsumed(before: Int, current: Int): Boolean = current < before

    fun crossesDitch(currentZ: Int, destinationZ: Int): Boolean =
        currentZ in 3518..3524 && (currentZ <= 3521) != (destinationZ <= 3521)

    fun nextReview(cycle: Int, range: IntRange, random: Random): Int =
        cycle + random.nextInt(range.first, range.last + 1)
}

internal class BotPvpReaction {
    var observed: BotPvpStyle? = null
        private set
    private var pending: BotPvpStyle? = null
    private var readyAt = 0

    fun observe(actual: BotPvpStyle, cycle: Int, delay: Int): BotPvpStyle {
        if (observed == null || delay <= 0) observed = actual
        if (actual == observed) {
            pending = null
        } else if (pending != actual) {
            pending = actual
            readyAt = cycle + delay
        } else if (cycle >= readyAt) {
            observed = actual
            pending = null
        }
        return checkNotNull(observed)
    }

    fun reset() {
        observed = null
        pending = null
        readyAt = 0
    }
}
