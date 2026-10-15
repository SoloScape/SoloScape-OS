package org.rsmod.content.skills.woodcutting.scripts

import kotlin.random.Random

/** Shared, deterministic Beehive event rules, separate from world/NPC lifetime. */
internal object ForestryHiveRules {
    const val HIVES = 6
    const val RESPAWN_TICKS = 3
    const val BUILD_TICKS = 2
    const val BUILD_ANIMATION = "seq.human_poh_build"
    val QUANTITY_OPTIONS = listOf("1", "5", "10", "X", "All", "Cancel")

    /** A cancelled/invalid dialog must never turn into an item-consuming action. */
    fun requestedLogs(option: Int, entered: Int, available: Int): Int {
        val requested = when (option) {
            0 -> 1
            1 -> 5
            2 -> 10
            3 -> entered
            4 -> available
            else -> 0
        }
        return requested.coerceAtLeast(0).coerceAtMost(available.coerceAtLeast(0))
    }


    // Choppers are sampled at event spawn, not from spectators who arrive later.
    // The OSRS wiki confirms scaling to ten choppers but omits the formula in its
    // text representation. This 10-logs-per-chopper baseline is isolated for tuning.
    fun logsPerHive(choppers: Int): Int = choppers.coerceIn(1, 10) * 10

    fun halfway(progress: Int, required: Int): Boolean =
        progress >= (required + 1) / 2

    fun completed(progress: Int, required: Int): Boolean = progress >= required

    fun partEligible(contributed: Boolean, hiveCompleted: Boolean, eligible: Boolean): Boolean =
        contributed && hiveCompleted && eligible

    fun sturdyPartDrop(random: Random): Boolean = random.nextInt(3) != 0

    fun barkForLog(symbol: String): Int = when (symbol) {
        "obj.logs" -> 2
        "obj.oak_logs", "obj.willow_logs" -> 3
        "obj.teak_logs", "obj.maple_logs", "obj.mahogany_logs" -> 4
        "obj.arctic_pine_log", "obj.yew_logs" -> 5
        "obj.magic_logs", "obj.redwood_logs" -> 6
        else -> 2
    }

    fun completionBark(random: Random): Int = if (random.nextInt(5) < 2) 25 else 26

    // Published reference gives 222.5 bonus Woodcutting XP at level 50.
    fun completionXp(level: Int): Double =
        (5.45 * level - 0.02 * level * level).coerceAtLeast(0.0)

    // The level-50 reference gives 28.8 Woodcutting XP per added log.
    fun logXp(level: Int): Double = level * 0.576

    const val CONSTRUCTION_XP_PER_LOG = 15.0
}
