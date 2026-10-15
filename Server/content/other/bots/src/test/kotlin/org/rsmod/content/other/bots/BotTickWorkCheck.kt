package org.rsmod.content.other.bots

object BotTickWorkCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        for (cycle in 0..15) {
            val next = (1..300).map { BotDecisionTiming.next(cycle, it) }
            check(next.groupingBy { it }.eachCount().values.toSet() == setOf(100))
            for (identity in 1..300) {
                for (delay in listOf(3, 10, 25, 50, 100)) {
                    val scheduled = BotDecisionTiming.next(cycle, identity, delay)
                    check(scheduled >= cycle + delay && scheduled <= cycle + delay + 2)
                    check(Math.floorMod(scheduled, 3) == Math.floorMod(identity, 3))
                }
            }
        }
        val delays = (1..10).map { BotDecisionTiming.retryDelay(it, 0) }
        check(delays == listOf(10, 20, 40, 80, 100, 100, 100, 100, 100, 100))
        check(BotDecisionTiming.retryDelay(10, 9) == 109)
        check(BotDecisionTiming.retryDelay(1, 0) == 10)

        // Travel gets first chance to move and both phases rotate fairly.
        val population = (0 until 300).toList()
        val travelSeen = mutableSetOf<Int>()
        val planningSeen = mutableSetOf<Int>()
        for (cycle in 0 until 300) {
            val ordered = BotDecisionScheduling.ordered(population, cycle) { it % 2 == 0 }
            check(ordered.size == 300 && ordered.toSet() == population.toSet())
            check(ordered.take(150).all { it % 2 == 0 })
            check(ordered.drop(150).all { it % 2 == 1 })
            travelSeen += ordered.first()
            planningSeen += ordered[150]
        }
        check(travelSeen.size == 150 && planningSeen.size == 150) {
            "Every moving and planning bot must eventually get first access to its budget"
        }
        check(BotDecisionScheduling.ordered(emptyList<Int>(), 3) { true }.isEmpty())
        check(BotDecisionScheduling.ordered(listOf(10, 11), -1) { it == 10 } ==
            listOf(10, 11))

        // A run of expensive new plans must never drain the separate capped
        // travel budget; likewise movement must leave planning capacity.
        var separatedClock = 0L
        val planning = BotTickWork(maxSearches = 1, maxNanos = 15,
            clock = { separatedClock })
        val travelling = BotTickWork(maxSearches = 1, maxNanos = 15,
            clock = { separatedClock })
        planning.beginTick()
        travelling.beginTick()
        planning.search { separatedClock += 20 }
        check(!planning.available && travelling.available)
        travelling.search { separatedClock += 20 }
        check(!travelling.available)
        planning.beginTick()
        travelling.beginTick()
        check(planning.available && travelling.available)
        planning.endTick()
        travelling.endTick()

        val resources = listOf("first", "second", "third", "fourth")
        check(BotCandidateOrder.resume(resources, "fourth") { it } ==
            listOf("fourth", "first", "second", "third")) {
            "A budget exhausted at the last candidate must resume there, not restart at the first"
        }
        check(BotCandidateOrder.resume(resources, "removed") { it } == resources)
        check(BotCandidateOrder.resume(emptyList<String>(), "removed") { it }.isEmpty())

        var now = 0L
        val work = BotTickWork(maxSearches = 2, maxNanos = 10, clock = { now })
        work.beginTick()
        check(work.search { true })
        check(work.available)
        work.search { false }
        check(!work.available)
        work.beginTick()
        work.search { now += 10 }
        check(!work.available)
        work.endTick()
        check(work.available) { "Emergency and startup work must not inherit tick limits" }
        work.beginTick()
        check(work.available)
        try {
            work.search { now += 10; error("search failed") }
        } catch (_: IllegalStateException) { }
        check(!work.available) { "Failed searches must still consume the routing budget" }

        val first = Any()
        val second = Any()
        val third = Any()
        val occupancy = BotOccupancy<Any, String>()
        occupancy.snapshot(sequenceOf(first to "A", second to "A", third to "B"))
        val ownView = occupancy.excluding(first)
        check("A" in ownView) { "Another player sharing our tile must remain occupied" }
        check("B" !in occupancy.excluding(third))
        occupancy.reserve(first, "C")
        check("C" !in ownView)
        check("C" in occupancy.excluding(second))
        occupancy.reserve(second, "C")
        check("C" in ownView) { "Reservations must update existing views within the same tick" }
        occupancy.release(second)
        check("C" !in ownView)
        occupancy.reserve(first, "D")
        check("C" !in occupancy.excluding(null))
        check("D" in occupancy.excluding(null))
        occupancy.snapshot(sequenceOf(first to "E", second to "F", third to "B"))
        check("A" !in ownView && "E" !in ownView && "F" in ownView)
        check("D" in occupancy.excluding(second)) { "Active destinations must survive tick refresh" }
        occupancy.remove(first)
        check("D" !in occupancy.excluding(null) && "E" !in occupancy.excluding(null))
        occupancy.release(first)
        println("Bot tick work checks passed: fair travel-first 300-bot scheduling, " +
            "independent routing budgets, backoff and live occupancy.")
    }
}
