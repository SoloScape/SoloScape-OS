package org.rsmod.content.skills.woodcutting.scripts

import org.rsmod.map.CoordGrid

/** Event timers use the original server's 600ms game cycle. */
enum class ForestryEventType(val title: String, val ticks: Int, val members: Boolean = true) {
    ROOTS("Rising Roots", 155, false),
    SAPLING("Struggling Sapling", 350, false),
    ENT("Friendly Ent", 200, false),
    FLOWERS("Flowering Tree", 300),
    LEPRECHAUN("Woodcutting Leprechaun", 120),
    HIVE("Beehive", 250),
    FOX("Poachers", 184),
    RITUAL("Enchantment Ritual", 200),
    PHEASANT("Pheasant Control", 160),
}

internal data class ForestryChop(val coords: CoordGrid, var cycle: Int)

/** Session history: two distinct chopping sessions, including failed woodcutting rolls. */
internal class ForestryHistory {
    private val trees = ArrayDeque<ForestryChop>()
    fun record(coords: CoordGrid, cycle: Int) {
        val previous = trees.lastOrNull()
        if (previous?.coords == coords && cycle - previous.cycle <= 4) previous.cycle = cycle
        else {
            trees.addLast(ForestryChop(coords, cycle))
            while (trees.size > 2) trees.removeFirst()
        }
    }
    fun eligible(origin: CoordGrid, cycle: Int): Boolean = trees.any {
        cycle - it.cycle in 0 until 300 && forestryNear(it.coords, origin, 30)
    }
    /** Count only choppers recently active on the event's specific tree. */
    fun activeAt(tree: CoordGrid, cycle: Int): Boolean = trees.any {
        it.coords == tree && cycle - it.cycle in 0..8
    }
    fun expired(cycle: Int): Boolean = trees.all { cycle - it.cycle >= 300 }
}

internal fun forestryNear(a: CoordGrid, b: CoordGrid, radius: Int): Boolean =
    a.level == b.level && kotlin.math.abs(a.x - b.x) <= radius && kotlin.math.abs(a.z - b.z) <= radius

/** Complex per-event progress, intentionally session-only; never serialized into a player save. */
internal class ForestryContribution(val eligible: Boolean) {
    var actions = 0
    var bark = 0
    var nextAction = 0
    var lastRound = -1
    var pollen = -1
    val ingredients = mutableListOf<Int>()
    var eggNest = -1
    val hives = mutableSetOf<Int>()
    val entlings = mutableSetOf<Int>()
    var completed = false

    fun takeBark(amount: Int): Int {
        if (!eligible || amount <= 0) return 0
        val result = amount.coerceAtMost(256 - bark)
        bark += result
        return result
    }
    fun ready(cycle: Int, delay: Int = 4): Boolean {
        if (cycle < nextAction || completed) return false
        nextAction = cycle + delay
        return true
    }
}

internal object ForestryRules {
    val entRequests = listOf("Short on top!", "A leafy mullet!",
        "Short back and sides!", "Breezy at the back!")
    val entOptions = listOf(setOf(3), setOf(3, 5), setOf(4, 5), setOf(4))
    fun infusedPhase(elapsed: Int): Int = if (elapsed < 30) -1 else (elapsed - 30) / 18
    fun ritualXp(level: Int): Double = 2.0 * level + 60
    fun ritualBonus(level: Int, steps: Int): Double = 2.0 * steps * level + 55
    // Jagex does not publish the final tree-specific spawn odds. These are SoloScape tuning.
    fun spawnPercent(level: Int, choppers: Int): Int =
        ((10 + level / 3) * (1.0 + (choppers.coerceIn(1, 10) - 1) / 9.0)).toInt().coerceAtMost(90)
    fun mulchNutrition(recipe: List<Int>, ingredients: List<Int>): Int =
        if (ingredients.size != 3) 0 else 10 + 30 * recipe.indices.count { recipe[it] == ingredients[it] }
    fun uniqueDenominator(level: Int): Int = (90 - level.coerceIn(1, 99) * 60 / 99).coerceAtLeast(30)
    fun goldenEggDenominator(level: Int): Int = 900 - (level.coerceIn(1, 99) - 1) * 450 / 98
    fun validCircle(circles: List<Pair<Int, Int>>): Int = circles.indices.single { i ->
        circles.count { it.first == circles[i].first } == 1 &&
            circles.count { it.second == circles[i].second } == 1
    }
    val leaves = listOf("obj.leaves", "obj.leaves_oak", "obj.leaves_willow", "obj.leaves_maple", "obj.leaves_yew", "obj.leaves_magic", "obj.oak_leaves", "obj.willow_leaves", "obj.maple_leaves", "obj.yew_leaves", "obj.magic_leaves")
    /**
     * Accept every log in the August 2026 OSRS Beehive reward table.
     * The four Sailing hardwoods depend on the connected cache revision:
     * listing a gameval here does not manufacture an absent cache item.
     */
    val logs = listOf(
        "obj.logs", "obj.achey_tree_logs",
        "obj.oak_logs", "obj.willow_logs", "obj.teak_logs", "obj.maple_logs",
        "obj.jatoba_logs", "obj.mahogany_logs",
        "obj.arctic_pine_log", "obj.yew_logs", "obj.camphor_logs",
        "obj.ironwood_logs", "obj.magic_logs", "obj.redwood_logs", "obj.rosewood_logs",
    )
}
