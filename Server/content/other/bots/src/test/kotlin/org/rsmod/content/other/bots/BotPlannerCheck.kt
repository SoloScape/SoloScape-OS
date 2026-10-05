package org.rsmod.content.other.bots

import kotlin.math.abs
import kotlin.math.max
import kotlin.random.Random
import org.rsmod.map.CoordGrid

/** Standalone deterministic checks: run this entrypoint with the bots module classpath. */
public object BotPlannerCheck {
    @JvmStatic
    public fun main(args: Array<String>) {
        val tasks = SourceBotCatalog.tasks
        check(tasks.size == 116)
        check(tasks.map { it.id }.toSet().size == tasks.size)
        check(tasks.all { it.weight > 0 && it.start.x in 0..16383 && it.start.z in 0..16383 })
        check(tasks.all { task -> task.route.all { it.x in 0..16383 && it.z in 0..16383 && it.level in 0..3 } })
        check(SourceBotCatalog.names.size == 1998)
        val oak = tasks.single { it.id == "DraynorOakWoodcutting" }
        check(!BotTaskPlanner.available(oak, mapOf("woodcutting" to 14), false))
        check(BotTaskPlanner.available(oak, mapOf("woodcutting" to 15), false))
        check(!BotTaskPlanner.available(oak, mapOf("woodcutting" to 30), false))
        val maple = tasks.single { it.id == "SeersMapleWoodcutting" }
        val mapleLevels = mapOf("woodcutting" to 45, "combat" to 21)
        check(!BotTaskPlanner.available(maple, mapleLevels, false))
        check(BotTaskPlanner.available(maple, mapleLevels, true))
        val fly = tasks.single { it.id == "AlKharidFlyFishing" }
        check(!BotTaskPlanner.available(fly, mapOf("fishing" to 20, "cooking" to 14), false))
        check(BotTaskPlanner.available(fly, mapOf("fishing" to 20, "cooking" to 15), false))
        check(!BotTaskPlanner.available(fly, mapOf("fishing" to 40, "cooking" to 40), false))
        val random = Random(7)
        val levels = mapOf("woodcutting" to 15, "mining" to 15, "fishing" to 20, "cooking" to 15, "combat" to 30)
        repeat(1000) {
            val selected = BotTaskPlanner.select(tasks, levels, false, emptyMap(), random)
            check(selected != null && BotTaskPlanner.available(selected, levels, false))
        }
        check(BotTaskPlanner.nextMilestone("woodcutting", 1) == 15)
        check(BotTaskPlanner.nextMilestone("mining", 60) == 75)
        check(BotTaskPlanner.nextMilestone("fishing", 80) == 85)
        check(BotTaskPlanner.nextMilestone("mining", 99) == 99)
        val start = CoordGrid(3232, 3230, 0)
        val route = BotRoutes.path(start, CoordGrid(3185, 3436, 0))
        check(route.isNotEmpty() && route.last() == CoordGrid(3185, 3436, 0))
        for ((from, to) in (listOf(start) + route).zipWithNext()) {
            val gap = max(abs(from.x - to.x), abs(from.z - to.z))
            check(BotRoutes.traversal(from, to) != null || (from.level == to.level && gap <= 50))
        }
        check(BotRoutes.path(CoordGrid(1, 1, 0), CoordGrid(15000, 15000, 3)).isEmpty())
        check(BotRoutes.traversal(CoordGrid(2985, 3296, 0), CoordGrid(2841, 4829, 0))?.item == "air talisman")
        println("Bot planner checks passed: 116 activities, 1998 names, unlocks, milestones and route continuity.")
    }
}
