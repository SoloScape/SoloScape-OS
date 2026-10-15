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
        println("Bot tick work checks passed: 300-bot staggering, backoff, budgets and live occupancy.")
    }
}
