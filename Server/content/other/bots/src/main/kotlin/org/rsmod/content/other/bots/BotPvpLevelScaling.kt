package org.rsmod.content.other.bots

import org.rsmod.api.utils.skills.CombatLevel

/**
 * Deterministic combat-level scaling for Wilderness bots.
 *
 * TSPS archetype levels remain the ceiling/build identity. We interpolate down from that ceiling
 * toward normal level-1 stats (10 Hitpoints), preserving 1-defence/low-prayer shapes naturally.
 * Primary spellcasters never scale below the Magic level needed for their configured attack spell.
 */
internal object BotPvpLevelScaling {
    const val MIN_COMBAT_LEVEL: Int = 10

    fun scale(
        loadout: BotPvpLoadout,
        identity: Int,
        minimumPrayer: Int = 1,
    ): BotPvpLoadout {
        val minimums = minimumLevels(loadout, minimumPrayer)
        // Runtime-only mechanic requirements may raise a stat above the pinned archetype ceiling.
        // MAX needs 25 Prayer so Protect Item is always a real, usable prayer.
        val effectiveCeiling = loadout.levels.mapValues { (stat, maximum) ->
            maxOf(maximum, minimums.getValue(stat))
        }
        val ceiling = combatLevel(effectiveCeiling)
        val floorCombat = maxOf(MIN_COMBAT_LEVEL, combatLevel(minimums))
        if (ceiling <= floorCombat) return loadout.copy(levels = effectiveCeiling)

        val span = ceiling - floorCombat + 1
        val target = floorCombat + Math.floorMod(identity + loadout.id.hashCode(), span)
        return loadout.copy(levels = scaleToCombat(effectiveCeiling, minimums, target))
    }

    fun combatLevel(levels: Map<String, Int>): Int =
        CombatLevel.calculate(
            attack = levels.getValue("stat.attack"),
            defence = levels.getValue("stat.defence"),
            strength = levels.getValue("stat.strength"),
            hitpoints = levels.getValue("stat.hitpoints"),
            ranged = levels.getValue("stat.ranged"),
            magic = levels.getValue("stat.magic"),
            prayer = levels.getValue("stat.prayer"),
        )

    internal fun scaleToCombat(
        ceiling: Map<String, Int>,
        minimums: Map<String, Int>,
        target: Int,
    ): Map<String, Int> {
        var best = minimums
        var bestCombat = combatLevel(best)
        var bestStep = 0

        for (step in 1..1000) {
            val candidate = ceiling.mapValues { (stat, maximum) ->
                val minimum = minimums.getValue(stat)
                minimum + ((maximum - minimum).coerceAtLeast(0) * step / 1000)
            }
            val combat = combatLevel(candidate)
            if (combat <= target && (combat > bestCombat || combat == bestCombat && step > bestStep)) {
                best = candidate
                bestCombat = combat
                bestStep = step
            }
        }
        return best
    }

    private fun minimumLevels(
        loadout: BotPvpLoadout,
        minimumPrayer: Int,
    ): Map<String, Int> {
        val levels = loadout.levels.mapValues { (stat, maximum) ->
            when (stat) {
                "stat.hitpoints" -> 10
                "stat.prayer" -> minimumPrayer.coerceAtLeast(1)
                else -> 1
            }
        }.toMutableMap()

        if (loadout.primaryStyle == BotPvpStyle.Magic) {
            val requiredMagic = attackSpellLevel(loadout.attackSpell)
            val ceilingMagic = loadout.levels.getValue("stat.magic")
            levels["stat.magic"] = minOf(requiredMagic, ceilingMagic).coerceAtLeast(1)
        }
        return levels
    }

    private fun attackSpellLevel(spell: String?): Int = when (spell?.lowercase()) {
        "fire bolt" -> 35
        "wind blast" -> 41
        "fire blast" -> 59
        "ice blitz" -> 82
        "ice barrage" -> 94
        else -> 1
    }
}
