package org.rsmod.content.skills.woodcutting.scripts

import kotlin.random.Random

/** Shared, deterministic Beehive event rules, separate from world/NPC lifetime. */
internal object ForestryHiveRules {
    const val HIVES = 6
    const val RESPAWN_TICKS = 3
    const val BUILD_TICKS = 2
    const val BUILD_ANIMATION = "seq.human_poh_build"
    const val QUANTITY_TITLE = "How many logs would you like to add?"

    // The Wiki confirms ten active choppers and a hard ceiling of 50 logs.
    // Its mathematical formula isn't exposed by the text mirror; the linear
    // 5-per-chopper interpolation is explicit here for later live verification.
    fun logsPerHive(choppers: Int): Int = choppers.coerceIn(1, 10) * 5

    fun halfway(progress: Int, required: Int): Boolean =
        progress >= (required + 1) / 2

    fun completed(progress: Int, required: Int): Boolean = progress >= required

    fun partEligible(contributed: Boolean, hiveCompleted: Boolean, eligible: Boolean): Boolean =
        contributed && hiveCompleted && eligible

    fun sturdyPartDrop(random: Random): Boolean = random.nextInt(3) != 0

    // 2026 OSRS Wiki: regular 2-3, intermediate 4-5, high-tier 5-6.
    // 1:1 chance per bark amount, with log quality selecting its tier.
    fun barkForLog(symbol: String, random: Random): Int = when (tier(symbol)) {
        0 -> 2 + random.nextInt(2)
        1 -> 4 + random.nextInt(2)
        else -> 5 + random.nextInt(2)
    }

    fun tier(symbol: String): Int = when (symbol) {
        "obj.logs", "obj.achey_tree_logs" -> 0
        "obj.oak_logs", "obj.willow_logs", "obj.teak_logs", "obj.maple_logs",
        "obj.mahogany_logs" -> 1
        else -> 2
    }

    // Wiki: normal 40% WC / 20% Construction;
    // medium logs 55-60% WC / 30% Construction;
    // high logs 75-80% WC / 40% Construction.
    fun logXp(level: Int, symbol: String, random: Random): Double =
        level * when (tier(symbol)) {
            0 -> 0.4
            1 -> (55 + random.nextInt(6)) / 100.0
            else -> (75 + random.nextInt(6)) / 100.0
        }

    fun constructionXp(level: Int, symbol: String): Double =
        level * when (tier(symbol)) {
            0 -> 0.2
            1 -> 0.3
            else -> 0.4
        }

    fun completionBark(random: Random): Int = if (random.nextInt(5) < 2) 25 else 26

    // Published reference gives 222.5 bonus Woodcutting XP at level 50.
    fun completionXp(level: Int): Double =
        (5.45 * level - 0.02 * level * level).coerceAtLeast(0.0)
}
