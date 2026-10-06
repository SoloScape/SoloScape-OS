package org.rsmod.content.other.bots

// Adapted from RSPSApp/tsps PvP profiles; see resources/TSPS-LICENSE.txt.
enum class BotPvpStyle { Melee, Ranged, Magic }

enum class BotPvpDifficulty(val displayName: String) {
    Novice("Easy"),
    Standard("Medium"),
    Veteran("Very Hard"),
    Elite("Extreme");

    companion object {
        fun parse(text: String): BotPvpDifficulty? =
            entries.firstOrNull {
                it.name.equals(text, ignoreCase = true) ||
                    it.displayName.equals(text, ignoreCase = true)
            }
    }
}

data class BotPvpProfile(
    val id: BotPvpDifficulty,
    val targetReview: IntRange,
    val prayerReview: IntRange,
    val targetStyleReaction: IntRange,
    val specReview: IntRange,
    val freezeReview: IntRange,
    val combatAction: IntRange,
    val eatAtHpRatio: Double,
    val foodCharges: Int,
    val comboEatChance: Double,
    val combatMoveChance: Double,
    val switchChance: Double,
    val specUseChance: Double,
    val specSwitchChance: Double,
    val specPressureHpRatio: Double,
    val retreatHpRatio: Double,
    val chaseDistanceTiles: Int,
    val freezeFollowUpChance: Double,
    val freezeUseChance: Double,
    val smiteUseChance: Double,
    val oneTickUseChance: Double = 0.0,
    val oneTickGmaulChance: Double = 0.0,
    val oneTickSwitchChance: Double = 0.0,
    val oneTickCooldown: Int = 5,
    val nextHitScriptChance: Double = 0.0,
    val nextHitStyleSwitchChance: Double = 0.0,
    val nextHitFreezeChance: Double = 0.0,
    val nextHitMeleeFinisherHpRatio: Double = 0.0,
    val nextHitScriptCooldown: Int = 1,
    val riskTolerance: Double,
    val confidenceTier: Int,
)

object BotPvpProfiles {
    private fun ticks(min: Int, max: Int): IntRange =
        ((min + 599) / 600).coerceAtLeast(1)..((max + 599) / 600).coerceAtLeast(1)

    val all: List<BotPvpProfile> = listOf(
        BotPvpProfile(
            id = BotPvpDifficulty.Novice,
            targetReview = ticks(2200, 4200), prayerReview = ticks(1440, 2560),
            targetStyleReaction = ticks(1440, 2560), specReview = ticks(1200, 2200),
            freezeReview = ticks(9000, 15000), combatAction = ticks(680, 1480),
            eatAtHpRatio = 0.61, foodCharges = 10, comboEatChance = 0.08,
            combatMoveChance = 0.10, switchChance = 0.35, specUseChance = 0.40,
            specSwitchChance = 0.65, specPressureHpRatio = 0.22, retreatHpRatio = 0.28,
            chaseDistanceTiles = 7, freezeFollowUpChance = 0.06, freezeUseChance = 0.0,
            smiteUseChance = 0.04, riskTolerance = 0.15, confidenceTier = 1,
        ),
        BotPvpProfile(
            id = BotPvpDifficulty.Standard,
            targetReview = ticks(1400, 2600), prayerReview = ticks(880, 1760),
            targetStyleReaction = 6..11, specReview = ticks(800, 1500),
            freezeReview = ticks(7500, 12000), combatAction = ticks(520, 1160),
            eatAtHpRatio = 0.53, foodCharges = 14, comboEatChance = 0.16,
            combatMoveChance = 0.30, switchChance = 0.65, specUseChance = 0.62,
            specSwitchChance = 0.80, specPressureHpRatio = 0.28, retreatHpRatio = 0.24,
            chaseDistanceTiles = 9, freezeFollowUpChance = 0.12, freezeUseChance = 0.16,
            smiteUseChance = 0.10, riskTolerance = 0.30, confidenceTier = 2,
        ),
        BotPvpProfile(
            id = BotPvpDifficulty.Veteran,
            targetReview = ticks(900, 1800), prayerReview = ticks(600, 1200),
            targetStyleReaction = 4..8, specReview = ticks(600, 1000),
            freezeReview = ticks(5500, 9500), combatAction = ticks(400, 960),
            eatAtHpRatio = 0.47, foodCharges = 20, comboEatChance = 0.26,
            combatMoveChance = 0.55, switchChance = 0.75, specUseChance = 0.80,
            specSwitchChance = 0.92, specPressureHpRatio = 0.34, retreatHpRatio = 0.21,
            chaseDistanceTiles = 12, freezeFollowUpChance = 0.20, freezeUseChance = 0.32,
            smiteUseChance = 0.18, oneTickUseChance = 0.70, oneTickGmaulChance = 0.70,
            oneTickSwitchChance = 0.75, oneTickCooldown = ticks(1800, 1800).first,
            nextHitScriptChance = 0.92, nextHitStyleSwitchChance = 0.85,
            nextHitFreezeChance = 0.34, nextHitMeleeFinisherHpRatio = 0.48,
            nextHitScriptCooldown = ticks(420, 420).first,
            riskTolerance = 0.50, confidenceTier = 3,
        ),
        BotPvpProfile(
            id = BotPvpDifficulty.Elite,
            targetReview = ticks(420, 900), prayerReview = ticks(256, 560),
            targetStyleReaction = 3..5, specReview = ticks(400, 700),
            freezeReview = ticks(2400, 4800), combatAction = ticks(208, 496),
            eatAtHpRatio = 0.39, foodCharges = 24, comboEatChance = 0.62,
            combatMoveChance = 0.75, switchChance = 0.95, specUseChance = 0.98,
            specSwitchChance = 1.0, specPressureHpRatio = 0.50, retreatHpRatio = 0.14,
            chaseDistanceTiles = 18, freezeFollowUpChance = 0.50, freezeUseChance = 0.74,
            smiteUseChance = 0.44, oneTickUseChance = 0.95, oneTickGmaulChance = 0.95,
            oneTickSwitchChance = 0.98, oneTickCooldown = ticks(900, 900).first,
            nextHitScriptChance = 0.995, nextHitStyleSwitchChance = 0.98,
            nextHitFreezeChance = 0.64, nextHitMeleeFinisherHpRatio = 0.62,
            nextHitScriptCooldown = ticks(220, 220).first,
            riskTolerance = 0.88, confidenceTier = 4,
        ),
    )

    fun get(difficulty: BotPvpDifficulty): BotPvpProfile = all.first { it.id == difficulty }

    /**
     * Hybrid is deliberately the hardest role inside each bracket without silently promoting the
     * bot into the next risk tier. It reacts one tick sooner where possible and gets modestly
     * stronger switching/support probabilities while retaining the bracket's feature ceiling.
     */
    fun get(difficulty: BotPvpDifficulty, role: BotPvpLoadoutRole): BotPvpProfile {
        val base = get(difficulty)
        if (role != BotPvpLoadoutRole.Hybrid) return base

        fun faster(range: IntRange): IntRange =
            (range.first - 1).coerceAtLeast(1)..(range.last - 1).coerceAtLeast(1)

        return base.copy(
            targetReview = faster(base.targetReview),
            prayerReview = faster(base.prayerReview),
            targetStyleReaction = faster(base.targetStyleReaction),
            specReview = faster(base.specReview),
            combatAction = faster(base.combatAction),
            comboEatChance = (base.comboEatChance + 0.08).coerceAtMost(1.0),
            combatMoveChance = (base.combatMoveChance + 0.08).coerceAtMost(1.0),
            switchChance = (base.switchChance + 0.08).coerceAtMost(1.0),
            specUseChance = (base.specUseChance + 0.05).coerceAtMost(1.0),
            specSwitchChance = (base.specSwitchChance + 0.05).coerceAtMost(1.0),
            freezeFollowUpChance = (base.freezeFollowUpChance + 0.08).coerceAtMost(1.0),
            freezeUseChance = (base.freezeUseChance + 0.08).coerceAtMost(1.0),
            smiteUseChance = (base.smiteUseChance + 0.05).coerceAtMost(1.0),
            riskTolerance = (base.riskTolerance + 0.08).coerceAtMost(1.0),
        )
    }

    fun parse(text: String): BotPvpProfile? = BotPvpDifficulty.parse(text)?.let(::get)
}
