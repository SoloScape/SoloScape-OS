package org.rsmod.content.skills.woodcutting.scripts

import kotlin.random.Random

fun main() {
    val rules = ForestryHiveRules
    check(rules.HIVES == 6)
    check(rules.logsPerHive(0) == 10)
    check(rules.logsPerHive(1) == 10)
    check(rules.logsPerHive(2) == 20)
    check(rules.logsPerHive(10) == 100)
    check(rules.logsPerHive(100) == 100)
    check(!rules.halfway(4, 10) && rules.halfway(5, 10))
    check(!rules.completed(9, 10) && rules.completed(10, 10))
    check(!rules.partEligible(true, false, true)) {
        "A contributor must never earn rare parts from an unfinished hive"
    }
    check(!rules.partEligible(true, true, false))
    check(!rules.partEligible(false, true, true))
    check(rules.partEligible(true, true, true))
    check(rules.barkForLog("obj.logs") == 2)
    check(rules.barkForLog("obj.oak_logs") == 3)
    check(rules.barkForLog("obj.teak_logs") == 4)
    check(rules.barkForLog("obj.yew_logs") == 5)
    check(rules.barkForLog("obj.magic_logs") == 6)
    check(rules.completionXp(50) == 222.5)
    check(rules.logXp(50) == 28.8)
    check(rules.CONSTRUCTION_XP_PER_LOG == 15.0)
    val random = Random(413)
    val rolls = (0 until 900).count { rules.sturdyPartDrop(random) }
    check(rolls in 550..650) { "Sturdy parts should have a 2/3 roll: $rolls/900" }
    val bark = (0 until 100).map { rules.completionBark(random) }
    check(bark.all { it == 25 || it == 26 })
    check(25 in bark && 26 in bark)
    println("ForestryHiveCheck passed: scalable shared hives, stages, XP, bark and rare drops.")
}
