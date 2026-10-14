package org.rsmod.content.other.bots

import kotlin.random.Random

/** Stable player-like preferences; not re-rolled each time a bot makes a decision. */
internal data class BotPersonality(
    val identity: Int,
    val focus: BotTaskKind,
    val preferredArea: String,
    val patience: Int,
    val sociability: Int,
    val efficiency: Int,
    val curiosity: Int,
    val cautious: Int,
) {
    val summary: String
        get() = "focus=$focus area=$preferredArea patience=$patience social=$sociability " +
            "efficient=$efficiency curious=$curiosity cautious=$cautious"
}

/**
 * High-level preferences only. Interactions, pathfinding and supplies must continue through
 * the native bot controllers. All timings are measured in 600ms game cycles.
 */
internal object BotHumanity {
    fun personality(identity: Int): BotPersonality {
        val random = Random(identity * 7919 + 17)
        return BotPersonality(
            identity = identity,
            focus = BotRoutinePlanner.expandedKinds.toList().random(random),
            preferredArea = listOf("Draynor", "Varrock", "Falador", "AlKharid",
                "Catherby", "Lumbridge", "Barbarian").random(random),
            patience = random.nextInt(15, 96),
            sociability = random.nextInt(5, 71),
            efficiency = random.nextInt(20, 96),
            curiosity = random.nextInt(5, 91),
            cautious = random.nextInt(15, 96),
        )
    }

    fun workingCycles(personality: BotPersonality, random: Random): Int {
        val minutes = (20 + personality.patience / 3 + random.nextInt(0, 36)).coerceIn(20, 90)
        return minutes * 100
    }

    fun nextPauseCycles(personality: BotPersonality, random: Random): Int =
        (120 + personality.efficiency * 6 + random.nextInt(100, 400)).coerceAtLeast(120)

    fun pauseCycles(personality: BotPersonality, random: Random): Int =
        (4 + (100 - personality.efficiency) / 7 + random.nextInt(3, 18)).coerceAtMost(45)

    fun sessionCycles(personality: BotPersonality, random: Random): Int =
        1200 + personality.patience * 20 + random.nextInt(600, 2000)

    /**
     * Crowd penalty stays active, but experienced, focused characters revisit familiar
     * locations and sometimes join friends. Caller filters by levels, inventory and membership.
     */
    fun chooseTask(
        tasks: List<BotTaskDefinition>,
        occupancy: Map<String, Int>,
        personality: BotPersonality,
        random: Random,
        current: BotTaskDefinition? = null,
        friend: BotTaskDefinition? = null,
        taskBias: Map<String, Double> = emptyMap(),
    ): BotTaskDefinition? {
        val available = tasks.filter { it.weight > 0 }
        if (available.isEmpty()) return null
        val weighted = available.map { task ->
            val preference = if (task.kind == personality.focus) 1.0 + personality.patience / 40.0
                else if (task.kind == current?.kind) 1.6 else 1.0
            val home = if (task.id.contains(personality.preferredArea, true)) 1.6 else 1.0
            val repeat = if (task.id == current?.id) (1.2 + personality.patience / 60.0) else 1.0
            // Friends deliberately pick the same spots often, but never override eligibility.
            val company = if (task.id == friend?.id) 4.0 else 1.0
            val exploration = if (task.id != current?.id) 0.75 + personality.curiosity / 150.0 else 1.0
            val safety = if (task.kind == BotTaskKind.Combat)
                (1.20 - personality.cautious / 100.0).coerceAtLeast(0.2) else 1.0
            task.weight.toDouble() * preference * home * repeat * company * exploration *
                safety * (taskBias[task.id] ?: 1.0) /
                (1.0 + (occupancy[task.id] ?: 0).coerceAtLeast(0))
        }
        var roll = random.nextDouble() * weighted.sum()
        for (index in available.indices) {
            roll -= weighted[index]
            if (roll < 0.0) return available[index]
        }
        return available.last()
    }

    fun ambientLine(kind: BotTaskKind, random: Random): String {
        val general = listOf("nice spot here", "gl everyone", "almost another level",
            "bank run soon", "how's everyone doing?")
        val local = when (kind) {
            BotTaskKind.Woodcutting -> listOf("these trees go quick", "wc levels taking ages")
            BotTaskKind.Mining -> listOf("mining for a bit", "rocks are busy today")
            BotTaskKind.Fishing -> listOf("fishing is pretty chill", "anyone cooking their catch?")
            BotTaskKind.Cooking -> listOf("burnt a few earlier", "training cooking today")
            BotTaskKind.Crafting -> listOf("crafting for a while")
            else -> emptyList()
        }
        return (general + local).random(random)
    }
}
