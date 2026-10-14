package org.rsmod.content.other.bots

import org.rsmod.map.CoordGrid

internal class BotProgressTimeout(private val limit: Int = 200) {
    private var since: Int? = null
    private var position: CoordGrid? = null
    private var xp = 0L

    fun expired(cycle: Int, coords: CoordGrid, totalXp: Long, blocked: Boolean): Boolean {
        if (!blocked || coords != position || totalXp != xp) since = cycle
        if (since == null) since = cycle
        position = coords
        xp = totalXp
        return blocked && cycle - since!! >= limit
    }
}
