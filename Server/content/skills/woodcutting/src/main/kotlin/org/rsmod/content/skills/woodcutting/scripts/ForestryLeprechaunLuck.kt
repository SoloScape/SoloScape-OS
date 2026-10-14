package org.rsmod.content.skills.woodcutting.scripts

import org.rsmod.api.attr.AttributeKey
import org.rsmod.game.entity.Player
import kotlin.random.Random

/**
 * Native desktop luck uses fifths of a charge (the mobile counter exposes these units).
 * Every rainbow grants 12 units / 2.4 chops, each successful eligible chop consumes 5.
 * The AttributeKey has a persistence key so remaining luck survives logout and restarts.
 */
internal object ForestryLeprechaunLuck {
    const val UNITS_PER_RAINBOW = 12
    const val UNITS_PER_CHOP = 5
    const val MAX_UNITS = 255
    private val stored = AttributeKey<Int>(persistenceKey = "forestry_leprechaun_luck")

    fun units(player: Player): Int = (player.attr[stored] ?: 0).coerceIn(0, MAX_UNITS)

    fun collect(player: Player): Int {
        val next = (units(player) + UNITS_PER_RAINBOW).coerceAtMost(MAX_UNITS)
        player.attr[stored] = next
        return next
    }

    /** A failed roll, or a level-1 tree, must never spend luck. */
    fun consume(player: Player, succeeded: Boolean, treeLevel: Int): Boolean {
        val current = units(player)
        if (!canConsume(current, succeeded, treeLevel)) return false
        player.attr[stored] = current - UNITS_PER_CHOP
        return true
    }

    internal fun canConsume(units: Int, succeeded: Boolean, treeLevel: Int): Boolean =
        succeeded && treeLevel > 1 && units >= UNITS_PER_CHOP

    // Average 22.4 anima bark per spent luck, without fractional inventory items.
    fun bark(): Int = if (Random.nextInt(5) < 2) 23 else 22

    // XP scales with both the tree's original log XP and its Woodcutting requirement.
    // OSRS's precise published modifier is not present in the source wiki text.
    fun bonusXp(baseXp: Double, treeLevel: Int, woodcuttingLevel: Int): Double =
        baseXp * 0.12 * (1.0 + treeLevel / 100.0) * (0.75 + woodcuttingLevel / 200.0)
}
