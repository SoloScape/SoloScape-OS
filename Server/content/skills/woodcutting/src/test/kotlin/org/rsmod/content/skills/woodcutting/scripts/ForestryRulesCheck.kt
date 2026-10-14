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
    check(!history.eligible(tree, 400))
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

    println("Forestry checks passed: nine event types, access tiers, mulch, ritual, egg rate, history, radius, contribution and spawn odds.")
}
