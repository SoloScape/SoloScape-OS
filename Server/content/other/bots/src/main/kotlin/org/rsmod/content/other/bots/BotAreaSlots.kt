package org.rsmod.content.other.bots

import org.rsmod.map.CoordGrid

internal data class BotWorkArea(val x: Int, val z: Int, val level: Int) {
    companion object {
        fun at(coords: CoordGrid) = BotWorkArea(coords.x / 16, coords.z / 16, coords.level)
        fun forTask(task: BotTaskDefinition) = at(task.route.lastOrNull() ?: task.start)
    }
}

internal class BotAreaSlots<Owner : Any>(private val capacity: (BotWorkArea) -> Int) {
    private val assignments = HashMap<Owner, BotWorkArea>()
    private val occupied = HashMap<BotWorkArea, Int>()

    fun available(owner: Owner, area: BotWorkArea): Boolean =
        capacity(area).let { limit -> limit == 0 || count(area, owner) < limit }

    fun count(area: BotWorkArea, excluding: Owner? = null): Int =
        (occupied[area] ?: 0) - if (assignments[excluding] == area) 1 else 0

    fun assign(owner: Owner, area: BotWorkArea): Boolean {
        if (!available(owner, area)) return false
        release(owner)
        assignments[owner] = area
        occupied[area] = (occupied[area] ?: 0) + 1
        return true
    }

    fun release(owner: Owner) {
        val area = assignments.remove(owner) ?: return
        val count = occupied.getValue(area)
        if (count == 1) occupied.remove(area) else occupied[area] = count - 1
    }
}

internal object BotMovementState {
    /** Count consecutive unchanged travel decisions so a blocked native route can be retried. */
    fun nextStall(previous: CoordGrid, current: CoordGrid, stalled: Int): Int =
        if (previous == current) (stalled + 1).coerceAtMost(20) else 0

    fun waiting(pending: Boolean, steps: Int, hasMoved: Boolean, stalled: Int): Boolean =
        (pending || steps > 0) && (hasMoved || stalled < 3)
}
