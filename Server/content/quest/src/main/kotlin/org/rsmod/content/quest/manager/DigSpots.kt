package org.rsmod.content.quest.manager

import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.map.CoordGrid

/**
 * Spade digs are shared by several quests. A handler claims a dig by returning true; the first
 * claiming handler wins, and an unclaimed dig finds nothing.
 */
object DigSpots {
    private val handlers = mutableListOf<suspend ProtectedAccess.(CoordGrid) -> Boolean>()

    fun register(handler: suspend ProtectedAccess.(CoordGrid) -> Boolean) {
        handlers += handler
    }

    internal suspend fun dig(access: ProtectedAccess): Boolean {
        val coords = access.player.coords
        return handlers.any { it(access, coords) }
    }
}
