package org.rsmod.content.skills.construction

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class HouseLimitsTest {
    @Test
    fun `every reference threshold and preceding level has the correct limits`() {
        val table = listOf(
            Triple(1, 24, 3), Triple(15, 24, 4), Triple(26, 25, 4),
            Triple(30, 25, 5), Triple(32, 26, 5), Triple(38, 27, 5),
            Triple(44, 28, 5), Triple(45, 28, 6), Triple(50, 29, 6),
            Triple(56, 30, 6), Triple(60, 30, 7), Triple(62, 31, 7),
            Triple(68, 32, 7), Triple(74, 33, 7), Triple(80, 34, 7),
            Triple(86, 35, 7), Triple(92, 36, 7), Triple(96, 37, 7),
            Triple(99, 38, 7),
        )
        for ((index, row) in table.withIndex()) {
            val (level, rooms, dimensions) = row
            val limits = HouseLimits.forLevel(level)
            assertEquals(HouseLimits(rooms, dimensions), limits, "Level $level")
            assertEquals(dimensions + 2, limits.yardDimensions)
            if (index > 0) {
                val previous = table[index - 1]
                assertEquals(HouseLimits(previous.second, previous.third), HouseLimits.forLevel(level - 1))
            }
        }
    }

    @Test
    fun `starter rooms fit and the yard border cannot hold new rooms`() {
        for (level in 1..99) {
            val limits = HouseLimits.forLevel(level)
            assertTrue(limits.contains(slotKey(LEVEL_GROUND, 4, 4)))
            assertTrue(limits.contains(slotKey(LEVEL_GROUND, 4, 5)))
            assertTrue(limits.contains(slotKey(LEVEL_GROUND, limits.minimum, limits.maximum)))
            assertFalse(limits.contains(slotKey(LEVEL_GROUND, limits.minimum - 1, 4)))
            assertFalse(limits.contains(slotKey(LEVEL_GROUND, 4, limits.maximum + 1)))
        }
    }

    @Test
    fun `room cap counts all floors but allows furniture in existing rooms`() {
        val layout = HouseLayout()
        for (floor in 0..3) for (x in 3..5) for (z in 3..5) {
            if (layout.rooms.size < 24) layout.place(slotKey(floor, x, z), 1, 0)
        }
        val upper = slotKey(3, 5, 5)
        assertNotNull(layout.additionRefusal(upper, 1))
        assertNull(layout.additionRefusal(upper, 26))
        assertNull(layout.additionRefusal(layout.rooms.keys.first(), 1))
        assertNotNull(layout.additionRefusal(slotKey(LEVEL_GROUND, 6, 4), 26))
        assertNull(layout.additionRefusal(slotKey(LEVEL_GROUND, 6, 4), 30))
    }
}
