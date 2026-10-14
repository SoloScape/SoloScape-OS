package org.rsmod.content.other.bots

import org.rsmod.map.CoordGrid

/** A character's training objective survives banking, supply detours and logout. */
public data class BotTrainingGoal(val skill: String, val level: Int) {
    init {
        require(skill in BotRoutinePlanner.skills && level in 2..99)
    }

    override fun toString(): String = "$skill:$level"

    public companion object {
        public fun parse(value: String?): BotTrainingGoal? {
            val parts = value?.split(':') ?: return null
            if (parts.size != 2 || parts[0] !in BotRoutinePlanner.skills) return null
            val level = parts[1].toIntOrNull()?.takeIf { it in 2..99 } ?: return null
            return BotTrainingGoal(parts[0], level)
        }
    }
}

internal object BotRoutinePlanner {
    val basicKinds = setOf(BotTaskKind.Mining, BotTaskKind.Fishing, BotTaskKind.Woodcutting)
    val expandedKinds = basicKinds + setOf(BotTaskKind.Cooking, BotTaskKind.Smelting,
        BotTaskKind.Smithing, BotTaskKind.Crafting, BotTaskKind.Spinning,
        BotTaskKind.Shearing, BotTaskKind.Tanning, BotTaskKind.Runecrafting)
    val skills = setOf("woodcutting", "fishing", "mining", "cooking", "smithing",
        "crafting", "runecrafting")

    fun goal(
        previous: BotTrainingGoal?, focus: BotTaskKind,
        tasks: List<BotTaskDefinition>, levels: Map<String, Int>,
    ): BotTrainingGoal? {
        val skillsAvailable = tasks.mapNotNull { it.skill }.filter { it in skills }.toSet()
        if (previous != null && previous.skill in skillsAvailable &&
            (levels[previous.skill] ?: 1) < previous.level) return previous
        val preferred = tasks.filter { it.kind == focus }.mapNotNull { it.skill }.toSet()
        val skill = skillsAvailable.filter { (levels[it] ?: 1) < 99 }
            .sortedWith(compareBy<String> { if (it in preferred) 0 else 1 }
                .thenBy { levels[it] ?: 1 }.thenBy { it }).firstOrNull() ?: return null
        return BotTrainingGoal(skill, BotTaskPlanner.nextMilestone(skill, levels[skill] ?: 1))
    }

    fun weight(task: BotTaskDefinition, position: CoordGrid, goal: BotTrainingGoal?): Double {
        // Distance to the bank plus the working route discourages cross-world job hopping.
        val approach = position.chebyshevDistance(task.start)
        val journey = (listOf(task.start) + task.route).zipWithNext().sumOf { (a, b) ->
            if (a.level == b.level) a.chebyshevDistance(b).coerceAtMost(100) else 100
        }
        val travel = 1.0 / (1.0 + (approach + journey) / 100.0)
        return travel * if (task.skill == goal?.skill) 3.0 else 1.0
    }

    fun followOn(previous: BotTaskKind, next: BotTaskKind): Boolean = when (previous) {
        BotTaskKind.Fishing -> next == BotTaskKind.Cooking
        BotTaskKind.Mining -> next == BotTaskKind.Smelting
        BotTaskKind.Smelting -> next == BotTaskKind.Smithing
        BotTaskKind.Shearing -> next == BotTaskKind.Spinning
        BotTaskKind.Tanning -> next == BotTaskKind.Crafting
        else -> false
    }
}
