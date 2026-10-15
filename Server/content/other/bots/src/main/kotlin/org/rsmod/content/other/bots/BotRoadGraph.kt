package org.rsmod.content.other.bots

import java.util.PriorityQueue
import org.rsmod.map.CoordGrid

internal class BotRoadGraph(
    roads: List<List<CoordGrid>>,
    crossings: Set<Pair<CoordGrid, CoordGrid>>,
    private val crossing: (CoordGrid, CoordGrid) -> Boolean,
) {
    private val points = (roads.flatten() + crossings.flatMap { listOf(it.first, it.second) })
        .distinct()
    private val indices = points.withIndex().associate { it.value to it.index }
    private val edges: Array<IntArray>

    init {
        val adjacent = Array(points.size) { linkedMapOf<Int, Int>() }
        fun connect(a: CoordGrid, b: CoordGrid) {
            if (a == b) return
            val traversal = crossing(a, b)
            if (!traversal && (a.level != b.level || a.chebyshevDistance(b) > 50)) return
            adjacent[indices.getValue(a)][indices.getValue(b)] =
                if (traversal) 20 else a.chebyshevDistance(b).coerceAtLeast(1)
        }
        for (road in roads) for ((a, b) in road.zipWithNext()) {
            connect(a, b)
            connect(b, a)
        }
        for ((a, b) in crossings) connect(a, b)
        for (i in points.indices) for (j in i + 1 until points.size) {
            val a = points[i]
            val b = points[j]
            if (a.level == b.level && a.chebyshevDistance(b) <= 25) {
                connect(a, b)
                connect(b, a)
            }
        }
        edges = Array(points.size) { index ->
            adjacent[index].flatMap { (next, weight) -> listOf(next, weight) }.toIntArray()
        }
    }

    fun path(
        from: CoordGrid,
        to: CoordGrid,
        canWalk: (CoordGrid, CoordGrid) -> Boolean,
        blocked: Set<Pair<CoordGrid, CoordGrid>>,
    ): List<CoordGrid> {
        if (from == to) return emptyList()
        if ((crossing(from, to) && from to to !in blocked) ||
            (from.level == to.level && from.chebyshevDistance(to) <= 25 && canWalk(from, to))) {
            return listOf(to)
        }
        val nodes = points.toMutableList()
        val start = indices[from] ?: nodes.size.also { nodes.add(from) }
        val end = indices[to] ?: nodes.size.also { nodes.add(to) }
        val connections = HashMap<Int, MutableMap<Int, Int>>()
        for (endpoint in setOf(start, end)) {
            val a = nodes[endpoint]
            for (index in nodes.indices) {
                val b = nodes[index]
                if (index == endpoint || a.level != b.level || a.chebyshevDistance(b) > 50) {
                    continue
                }
                fun connect(source: Int, target: Int) {
                    val cost = if (crossing(nodes[source], nodes[target])) 20
                        else a.chebyshevDistance(b).coerceAtLeast(1)
                    connections.getOrPut(source) { HashMap() }[target] = cost
                }
                connect(endpoint, index)
                connect(index, endpoint)
            }
        }
        val costs = IntArray(nodes.size) { Int.MAX_VALUE }
        val previous = IntArray(nodes.size) { -1 }
        val visited = BooleanArray(nodes.size)
        val queue = PriorityQueue<Node>(compareBy<Node> { it.cost }.thenBy { it.index })
        costs[start] = 0
        queue.add(Node(start, 0))
        while (queue.isNotEmpty()) {
            val current = queue.poll()
            if (visited[current.index] || current.cost != costs[current.index]) continue
            if (current.index == end) {
                val result = ArrayList<CoordGrid>()
                var index = end
                while (index != start) {
                    result.add(nodes[index])
                    index = previous[index]
                }
                result.reverse()
                return result
            }
            visited[current.index] = true
            fun relax(next: Int, weight: Int) {
                val cost = current.cost + weight
                if (visited[next] || cost >= costs[next]) return
                val source = nodes[current.index]
                val target = nodes[next]
                if (source to target in blocked) return
                if (!crossing(source, target) && !canWalk(source, target)) return
                costs[next] = cost
                previous[next] = current.index
                queue.add(Node(next, cost))
            }
            if (current.index < edges.size) {
                val adjacent = edges[current.index]
                for (i in adjacent.indices step 2) relax(adjacent[i], adjacent[i + 1])
            }
            for ((next, weight) in connections[current.index].orEmpty()) relax(next, weight)
        }
        return emptyList()
    }

    private data class Node(val index: Int, val cost: Int)
}
