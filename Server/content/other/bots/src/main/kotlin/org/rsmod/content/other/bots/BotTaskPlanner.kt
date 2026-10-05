package org.rsmod.content.other.bots

import kotlin.random.Random

/** Weighted activity selection and progressive training milestones. */
public object BotTaskPlanner {
    public fun available(
        task: BotTaskDefinition,
        levels: Map<String, Int>,
        members: Boolean,
    ): Boolean {
        if (task.members && !members) return false
        val level = task.skill?.let { levels[it] ?: 1 } ?: 1
        if (level !in task.minimumLevel..task.maximumLevel) return false
        if (task.requiredLevels.any { (skill, minimum) -> (levels[skill] ?: 1) < minimum }) return false
        val combat = levels["combat"] ?: 3
        if (combat !in task.minimumCombatLevel..task.maximumCombatLevel) return false
        if (task.progressionBelow.isNotEmpty()) {
            val checks = task.progressionBelow.map { (skill, cap) -> (levels[skill] ?: 1) < cap }
            if (task.progressionAnyBelow && checks.none { it }) return false
            if (!task.progressionAnyBelow && checks.any { !it }) return false
        }
        return true
    }

    public fun select(
        tasks: List<BotTaskDefinition>,
        levels: Map<String, Int>,
        members: Boolean,
        occupancy: Map<String, Int>,
        random: Random,
    ): BotTaskDefinition? {
        val candidates = tasks.filter { available(it, levels, members) && it.weight > 0 }
        if (candidates.isEmpty()) return null
        // Preserve source task weights while distributing crowds across locations.
        val weights = candidates.map { it.weight.toDouble() / (1 + (occupancy[it.id] ?: 0).coerceAtLeast(0)) }
        var roll = random.nextDouble() * weights.sum()
        for ((index, task) in candidates.withIndex()) {
            roll -= weights[index]
            if (roll < 0.0) return task
        }
        return candidates.last()
    }

    public fun nextMilestone(skill: String, level: Int): Int {
        val milestones = when (skill.lowercase()) {
            "woodcutting" -> listOf(15, 30, 45, 60, 75)
            "fishing" -> listOf(20, 30, 40, 50, 60, 70, 80)
            "mining" -> listOf(20, 35, 45, 60, 75, 90)
            else -> emptyList()
        }
        return milestones.firstOrNull { it > level } ?: (level + 5).coerceAtMost(99)
    }
}
