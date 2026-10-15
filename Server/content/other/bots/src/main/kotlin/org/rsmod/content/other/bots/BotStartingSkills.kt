package org.rsmod.content.other.bots

import kotlin.random.Random

/**
 * Initial non-progressive skiller levels. Each identity gets a repeatable, independent
 * spread of skills instead of having every skilling stat begin in the same 30-79 band.
 * Saved bot profiles still override these defaults when they are restored.
 */
internal object BotStartingSkills {
    private val combat = setOf("attack", "defence", "strength", "ranged", "prayer", "magic")

    fun levels(identity: Int, focus: BotTaskKind): Map<String, Int> {
        val random = Random(identity * 7919 + 131)
        val specialist = when (focus) {
            BotTaskKind.Woodcutting -> "woodcutting"
            BotTaskKind.Fishing -> "fishing"
            BotTaskKind.Mining -> "mining"
            BotTaskKind.Smithing, BotTaskKind.Smelting -> "smithing"
            BotTaskKind.Cooking -> "cooking"
            BotTaskKind.Runecrafting -> "runecrafting"
            BotTaskKind.Shearing, BotTaskKind.Spinning,
            BotTaskKind.Tanning, BotTaskKind.Crafting -> "crafting"
            else -> null
        }
        return BotSkills.all.associate { stat ->
            val skill = stat.removePrefix("stat.")
            val rolled = when (skill) {
                "hitpoints" -> random.nextInt(35, 80)
                in combat -> random.nextInt(30, 80)
                else -> random.nextInt(1, 96)
            }
            val level = if (skill == specialist) {
                maxOf(rolled, random.nextInt(35, 86))
            } else rolled
            skill to level
        }
    }
}
