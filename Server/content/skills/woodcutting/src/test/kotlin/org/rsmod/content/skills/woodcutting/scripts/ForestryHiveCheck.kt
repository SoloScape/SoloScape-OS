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
    check(rules.QUANTITY_OPTIONS == listOf("1", "5", "10", "X", "All", "Cancel"))
    check(rules.BUILD_TICKS == 2)
    check(rules.BUILD_ANIMATION == "seq.human_poh_build")
    check(rules.requestedLogs(0, 0, 100) == 1)
    check(rules.requestedLogs(1, 0, 100) == 5)
    check(rules.requestedLogs(2, 0, 100) == 10)
    check(rules.requestedLogs(3, 7, 100) == 7)
    check(rules.requestedLogs(3, 0, 100) == 0) // No X amount means cancel.
    check(rules.requestedLogs(3, Int.MAX_VALUE, 12) == 12)
    check(rules.requestedLogs(4, 0, 12) == 12)
    check(rules.requestedLogs(4, 0, 0) == 0)
    check(rules.requestedLogs(5, 0, 12) == 0)
    check(rules.requestedLogs(-1, 500, 12) == 0)
    check(rules.requestedLogs(9, 500, 12) == 0)
    check(rules.requestedLogs(2, 0, 3) == 3)
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
    val tiers = listOf("obj.logs", "obj.oak_logs", "obj.willow_logs",
        "obj.teak_logs", "obj.maple_logs", "obj.mahogany_logs",
        "obj.arctic_pine_log", "obj.yew_logs", "obj.magic_logs", "obj.redwood_logs")
    check(tiers.map(rules::tier) == listOf(0, 1, 1, 1, 1, 1, 2, 2, 2, 2))
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
    check(rules.completionXp(50) == 222.5)
    val random = Random(413)
    val rolls = (0 until 900).count { rules.sturdyPartDrop(random) }
    check(rolls in 550..650) { "Sturdy parts should have a 2/3 roll: $rolls/900" }
    val bark = (0 until 100).map { rules.completionBark(random) }
    check(bark.all { it == 25 || it == 26 })
    check(25 in bark && 26 in bark)
    println("ForestryHiveCheck passed: scalable shared hives, stages, XP, bark and rare drops.")
}
