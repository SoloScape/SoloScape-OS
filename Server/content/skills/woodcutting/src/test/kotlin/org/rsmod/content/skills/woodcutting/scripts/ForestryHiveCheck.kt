package org.rsmod.content.skills.woodcutting.scripts

import kotlin.random.Random
import org.rsmod.map.CoordGrid

fun main() {
    val rules = ForestryHiveRules
    val history = ForestryHistory()
    val tree = CoordGrid(3200, 3200)
    val other = tree.translate(1, 0)
    history.record(tree, 10)
    check(history.activeAt(tree, 18))
    check(!history.activeAt(tree, 19))
    check(!history.activeAt(other, 12))
    history.record(other, 20)
    check(history.activeAt(other, 20) && !history.activeAt(tree, 20))
    check(rules.QUANTITY_TITLE == "How many logs would you like to add?")
    val selector = org.rsmod.content.skills.SkillMultiConfig(
        verb = "add",
        entries = listOf(org.rsmod.content.skills.SkillMultiEntry(
            "obj.logs", labelOverride = "Beehive")),
        maxCountProvider = { _, _ -> 28 },
        titleOverride = rules.QUANTITY_TITLE,
    )
    check(selector.title == rules.QUANTITY_TITLE)
    check(selector.entries.single().labelOverride == "Beehive")
    check(selector.maxCountProvider != null)
    check(rules.BUILD_TICKS == 2)
    check(rules.BUILD_ANIMATION == "seq.human_poh_build")
    check(rules.HIVES == 6)
    check(rules.logsPerHive(0) == 5)
    check(rules.logsPerHive(1) == 5)
    check(rules.logsPerHive(2) == 10)
    check(rules.logsPerHive(5) == 25)
    check(rules.logsPerHive(10) == 50)
    check(rules.logsPerHive(100) == 50)
    check(!rules.halfway(4, 10) && rules.halfway(5, 10))
    check(!rules.completed(9, 10) && rules.completed(10, 10))
    check(!rules.partEligible(true, false, true)) {
        "A contributor must never earn rare parts from an unfinished hive"
    }
    check(!rules.partEligible(true, true, false))
    check(!rules.partEligible(false, true, true))
    check(rules.partEligible(true, true, true))
    val tiers = listOf(
        "obj.logs", "obj.achey_tree_logs",
        "obj.oak_logs", "obj.willow_logs", "obj.teak_logs", "obj.maple_logs",
        "obj.jatoba_logs", "obj.mahogany_logs", "obj.arctic_pine_log",
        "obj.yew_logs", "obj.camphor_logs", "obj.ironwood_logs",
        "obj.magic_logs", "obj.redwood_logs", "obj.rosewood_logs",
    )
    check(ForestryRules.logs.toSet() == tiers.toSet()) {
        "Every documented Beehive log must be accepted, not only assigned an XP tier."
    }
    check(tiers.map(rules::tier) == listOf(0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2))
    val amounts = (0 until 100).map { Random(it) }
    check(amounts.map { rules.barkForLog("obj.logs", it) }.all { it in 2..3 })
    check(amounts.map { rules.barkForLog("obj.oak_logs", it) }.all { it in 4..5 })
    check(amounts.map { rules.barkForLog("obj.yew_logs", it) }.all { it in 5..6 })
    check(amounts.map { rules.logXp(50, "obj.logs", it) }.all { it == 20.0 })
    check(amounts.map { rules.logXp(50, "obj.oak_logs", it) }.all { it in 27.5..30.0 })
    check(amounts.map { rules.logXp(50, "obj.yew_logs", it) }.all { it in 37.5..40.0 })
    check(rules.constructionXp(50, "obj.logs") == 10.0)
    check(rules.constructionXp(50, "obj.oak_logs") == 15.0)
    check(rules.constructionXp(99, "obj.magic_logs") == 39.6)
    // New Sailing hardwoods reuse the documented middle/high reward ranges.
    for (symbol in listOf("obj.jatoba_logs")) {
        check(rules.constructionXp(99, symbol) == 29.7)
        check((0 until 100).all { rules.barkForLog(symbol, Random(it)) in 4..5 })
        check((0 until 100).all { rules.logXp(99, symbol, Random(it)) in 54.45..59.4 })
    }
    for (symbol in listOf("obj.camphor_logs", "obj.ironwood_logs", "obj.rosewood_logs")) {
        check(rules.constructionXp(99, symbol) == 39.6)
        check((0 until 100).all { rules.barkForLog(symbol, Random(it)) in 5..6 })
        check((0 until 100).all { rules.logXp(99, symbol, Random(it)) in 74.25..79.2 })
    }
    // These are snapshots of our *provisional* equation, not verified OSRS
    // completion XP. The wiki text mirror supplies only the level-50 anchor.
    val provisionalCompletionXp = mapOf(
        50 to 222.5, 60 to 255.0, 70 to 283.5,
        80 to 308.0, 90 to 328.5, 99 to 343.53,
    )
    for ((level, expected) in provisionalCompletionXp) {
        check(kotlin.math.abs(rules.completionXp(level) - expected) < 0.000001) {
            "Provisional Beehive completion XP changed at Woodcutting $level"
        }
    }
    check(rules.HIVES == 6)
    check(rules.partEligible(contributed = true, hiveCompleted = true, eligible = true))
    check(rules.partEligible(contributed = false, hiveCompleted = true, eligible = true).not())
    val random = Random(413)
    val rolls = (0 until 900).count { rules.sturdyPartDrop(random) }
    check(rolls in 550..650) { "Sturdy parts should have a 2/3 roll: $rolls/900" }
    val bark = (0 until 100).map { rules.completionBark(random) }
    check(bark.all { it == 25 || it == 26 })
    check(25 in bark && 26 in bark)
    println("ForestryHiveCheck passed: scalable shared hives, stages, XP, bark and rare drops.")
}
