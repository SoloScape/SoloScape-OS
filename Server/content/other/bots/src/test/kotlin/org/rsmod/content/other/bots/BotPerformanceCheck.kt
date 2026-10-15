package org.rsmod.content.other.bots

import dev.openrune.types.InventoryServerType
import dev.openrune.types.ItemServerType
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory
import org.rsmod.map.CoordGrid

object BotPerformanceCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val a = CoordGrid(1000, 1000, 0)
        val b = a.translate(40, 0)
        val c = a.translate(80, 0)
        val d = a.translate(120, 0)
        val crossing = setOf(b to c, c to b)
        val graph = BotRoadGraph(listOf(listOf(a, b, c, d)), crossing) { x, z ->
            x to z in crossing
        }
        val reachable: (CoordGrid, CoordGrid) -> Boolean = { x, z ->
            x.level == z.level && x.chebyshevDistance(z) <= 50
        }
        repeat(50) {
            check(graph.path(a, d, reachable, emptySet()) == listOf(b, c, d))
        }
        check(graph.path(a, d, reachable, crossing).isEmpty())
        check(graph.path(a, d, { _, _ -> false }, emptySet()).isEmpty())
        check(graph.path(a, d, reachable, emptySet()).isNotEmpty()) {
            "Restored collision must be checked against the same prebuilt graph"
        }
        check(graph.path(a.translate(-35, 0), d, reachable, emptySet()).last() == d)

        val cache = BotActivityCache<String>()
        var eligibleBuilds = 0
        var suppliedBuilds = 0
        fun eligible(key: Int) = cache.eligible(key) { eligibleBuilds++; listOf("mine") }
        fun supplied(key: Int, tick: Int) = cache.supplied(key, tick, 50) {
            suppliedBuilds++; listOf("mine")
        }
        eligible(1)
        supplied(1, 0)
        repeat(10) { eligible(1); supplied(1, 1) }
        check(eligibleBuilds == 1 && suppliedBuilds == 1)
        supplied(2, 2)
        check(suppliedBuilds == 2)
        eligible(2)
        supplied(2, 3)
        check(eligibleBuilds == 2 && suppliedBuilds == 3)
        supplied(2, 53)
        check(suppliedBuilds == 4) { "Fallback refresh must cover direct backing-array changes" }

        val inventory = Inventory(InventoryServerType(id = 1, size = 4), arrayOfNulls(4))
        val item = ItemServerType(id = 1, name = "fixture")
        inventory[0] = InvObj(item, 1)
        check(inventory.mutationVersion == 1L)
        inventory[0] = InvObj(item, 1)
        check(inventory.mutationVersion == 1L)
        inventory[0] = InvObj(item, 2)
        check(inventory.mutationVersion == 2L)
        inventory.fillNulls()
        check(inventory.mutationVersion == 3L)
        inventory.fillNulls()
        check(inventory.mutationVersion == 3L)
        inventory.ensureCapacity(5)
        check(inventory.mutationVersion == 4L)

        val slots = BotAreaSlots<String> { if (it.level == 1) 0 else 2 }
        val area = BotWorkArea.at(a)
        check(slots.assign("one", area) && slots.assign("two", area))
        check(!slots.assign("three", area))
        check(slots.assign("one", area) && slots.count(area) == 2)
        slots.release("two")
        check(slots.assign("three", area))
        check(slots.assign("one", BotWorkArea(1, 1, 1)))
        check(slots.count(area) == 1)
        slots.release("one")
        slots.release("one")

        check(BotMovementState.waiting(false, 5, false, 0))
        check(BotMovementState.waiting(true, 0, false, 2))
        check(BotMovementState.waiting(false, 5, true, 20))
        check(!BotMovementState.waiting(false, 5, false, 3))
        check(!BotMovementState.waiting(false, 0, false, 0))
        // Walking bots must update their progress each decision; otherwise stalled
        // stays zero and the unfinished native route is never retried.
        var stalledTravel = 0
        repeat(2) {
            stalledTravel = BotMovementState.nextStall(a, a, stalledTravel)
            check(BotMovementState.waiting(true, 5, false, stalledTravel))
        }
        stalledTravel = BotMovementState.nextStall(a, a, stalledTravel)
        check(stalledTravel == 3)
        check(!BotMovementState.waiting(true, 5, false, stalledTravel))
        check(BotMovementState.nextStall(a, b, stalledTravel) == 0)
        check(BotMovementState.waiting(true, 5, true, 0))
        repeat(30) { stalledTravel = BotMovementState.nextStall(a, a, stalledTravel) }
        check(stalledTravel == 20) { "Travel must reach its bounded recovery threshold" }

        var report: List<String>? = null
        check(BotMetrics.start(0, 2, 1) { report = it })
        check(!BotMetrics.start(0, 2, 0) { error("Concurrent measurement") })
        BotMetrics.beginTick(0)
        check(!BotMetrics.measuring)
        BotMetrics.endTick(300)
        for (tick in 1..2) {
            BotMetrics.beginTick(tick)
            check(BotMetrics.measuring)
            BotMetrics.recordBot(1000)
            BotMetrics.route(100)
            BotMetrics.scan()
            BotMetrics.endTick(300)
        }
        check(!BotMetrics.measuring)
        check(checkNotNull(report).any { "searches=2" in it && "resourceScans=2" in it })
        check(BotMetrics.stats(longArrayOf(1, 2, 3), 1.0).contains("max=3.00"))
        println("Bot performance checks passed: graph reuse, live collision, cache invalidation, " +
            "inventory revisions, area capacities, movement waits and bounded metrics.")
    }
}
