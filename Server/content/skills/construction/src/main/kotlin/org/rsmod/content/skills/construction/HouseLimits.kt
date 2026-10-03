package org.rsmod.content.skills.construction

data class HouseLimits(val rooms: Int, val dimensions: Int) {
    val yardDimensions: Int get() = dimensions + 2
    val minimum: Int get() = (HOUSE_GRID - dimensions + 1) / 2
    val maximum: Int get() = minimum + dimensions - 1

    fun contains(slot: Int): Boolean =
        inGrid(slotLevel(slot), slotX(slot), slotZ(slot)) &&
            slotX(slot) in minimum..maximum && slotZ(slot) in minimum..maximum

    companion object {
        fun forLevel(level: Int): HouseLimits {
            val rooms = when {
                level >= 99 -> 38
                level >= 96 -> 37
                level >= 92 -> 36
                level >= 26 -> 25 + (level - 26) / 6
                else -> 24
            }
            val dimensions = when {
                level >= 60 -> 7
                level >= 45 -> 6
                level >= 30 -> 5
                level >= 15 -> 4
                else -> 3
            }
            return HouseLimits(rooms, dimensions)
        }
    }
}

fun HouseLayout.additionRefusal(slot: Int, constructionLevel: Int): String? {
    if (slot in rooms) return null
    val limits = HouseLimits.forLevel(constructionLevel)
    if (rooms.size >= limits.rooms) {
        return "You can only have ${limits.rooms} rooms at your Construction level."
    }
    if (!limits.contains(slot)) {
        return "Your house can only be ${limits.dimensions} by ${limits.dimensions} rooms at your Construction level."
    }
    return null
}
