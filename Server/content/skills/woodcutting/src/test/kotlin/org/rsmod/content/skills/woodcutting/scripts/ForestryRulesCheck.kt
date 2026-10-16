package org.rsmod.content.skills.woodcutting.scripts

import org.rsmod.map.CoordGrid

/** Standalone Forestry mechanics regression checks; run via tools/test_woodcutting.py. */
fun main() {
    check(ForestryEventType.entries.size == 9)
    check(ForestryEventType.entries.count { !it.members } == 3)
    check(ForestryEventType.entries.map { it.name }.toSet().size == 9)
    check(ForestryEventType.entries.all { it.ticks > 0 })

    check(ForestryRules.mulchNutrition(listOf(0, 1, 2), listOf(0, 1, 2)) == 100)
    check(ForestryRules.mulchNutrition(listOf(0, 1, 2), listOf(0, 3, 2)) == 70)
    check(ForestryRules.mulchNutrition(listOf(0, 1, 2), listOf(3, 4, 0)) == 10)
    check(ForestryRules.mulchNutrition(listOf(0, 1, 2), listOf(0, 1)) == 0)
    check(ForestryRules.goldenEggDenominator(1) == 900)
    check(ForestryRules.goldenEggDenominator(99) == 450)
    check(kotlin.math.abs(ForestryRules.rootXp(50, false) - 27.5) < 0.0001)
    check(kotlin.math.abs(ForestryRules.rootXp(50, true) - 60.0) < 0.0001)
    check((1..1000).all { ForestryRules.firstInfusedDelay(kotlin.random.Random(it)) in 25..35 })
    check(ForestryRules.infusedPhase(24, 25) == -1)
    check(ForestryRules.infusedPhase(25, 25) == 0)
    check(ForestryRules.infusedPhase(44, 25) == 0)
    check(ForestryRules.infusedPhase(45, 25) == 1)
    check(ForestryRules.infusedPhase(200, 25) == 5)
    check(ForestryRules.rootBark(15, false, true) == 2)
    check(ForestryRules.rootBark(40, false, true) == 3)
    check(ForestryRules.rootBark(99, false, true) == 4)
    check(ForestryRules.rootBark(15, true, true) == 8)
    check(ForestryRules.rootBark(40, true, true) == 10)
    check(ForestryRules.rootBark(41, true, true) == 11)
    check(ForestryRules.rootBark(99, true, true) == 13)
    check(ForestryRules.rootBark(99, true, false) == 1)

    val circles = listOf(0 to 0, 0 to 1, 1 to 0, 1 to 1, 2 to 2)
    check(ForestryRules.validCircle(circles) == 4)
    val tree = CoordGrid(3200, 3200)
    val near = CoordGrid(3210, 3190)
    val far = CoordGrid(3240, 3200)
    check(forestryNear(tree, near, 30))
    check(!forestryNear(tree, far, 30))

    val history = ForestryHistory()
    history.record(tree, 100)
    history.record(tree, 101)
    check(history.eligible(near, 101))
    check(history.eligible(tree, 399))
    check(!history.eligible(tree, 401))
    history.record(far, 401)
    check(history.eligible(far, 401))
    check(!history.eligible(tree, 401))
    check(!history.expired(401))
    check(history.expired(701))

    val contribution = ForestryContribution(eligible = true)
    check(contribution.takeBark(300) == 256)
    check(contribution.takeBark(12) == 0)
    check(contribution.ready(100))
    check(!contribution.ready(102))
    check(contribution.ready(104))
    check(!ForestryContribution(eligible = false).let { it.takeBark(15) > 0 })
    check(ForestryRules.spawnPercent(99, 10) >= ForestryRules.spawnPercent(99, 1))

    // Rainbow collection grants twelve fifth-units; successful non-level-1 chopping
    // consumes five, leaving fractional luck for later sessions.
    check(ForestryLeprechaunLuck.UNITS_PER_RAINBOW == 12)
    check(ForestryLeprechaunLuck.UNITS_PER_CHOP == 5)
    check(ForestryLeprechaunLuck.MAX_UNITS == 255)
    check(ForestryLeprechaunLuck.canConsume(12, succeeded = true, treeLevel = 15))
    check(ForestryLeprechaunLuck.canConsume(5, succeeded = true, treeLevel = 15))
    check(!ForestryLeprechaunLuck.canConsume(4, succeeded = true, treeLevel = 15))
    check(!ForestryLeprechaunLuck.canConsume(12, succeeded = false, treeLevel = 15))
    check(!ForestryLeprechaunLuck.canConsume(12, succeeded = true, treeLevel = 1))
    check(ForestryLeprechaunLuck.bonusXp(67.5, 30, 75) > 0.0)

    println("Forestry checks passed: nine event types, access tiers, mulch, ritual, egg rate, history, radius, contribution, spawn odds, and persistent Leprechaun luck rules.")
}
