package org.rsmod.content.skills.construction

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.rsmod.content.skills.construction.data.HouseStyle
import org.rsmod.map.zone.ZoneKey

class HouseRegionsTest {
    @Test
    fun `yard fills every ground slot and preserves rotated rooms on every floor`() {
        val layout = HouseLayout(style = HouseStyle.FANCY_STONE)
        val garden = slotKey(LEVEL_GROUND, 4, 4)
        val parlour = slotKey(LEVEL_GROUND, 4, 5)
        val upper = slotKey(LEVEL_GROUND + 1, 4, 5)
        layout.place(garden, 1, 0)
        layout.place(parlour, 2, 2)
        layout.place(upper, 2, 1)
        val sources = mapOf(garden to ZoneKey(232, 881, 0),
            parlour to ZoneKey(232, 887, 0), upper to ZoneKey(232, 887, 0))
        for (level in listOf(1, 15, 30, 45, 60, 99)) {
            val limits = HouseLimits.forLevel(level)
            val copies = houseZoneCopies(layout, level, sources)
            assertEquals(limits.yardDimensions * limits.yardDimensions + 1, copies.size)
            houseTemplate(layout, level, sources)
            for (x in limits.minimum - 1..limits.maximum + 1) {
                for (z in limits.minimum - 1..limits.maximum + 1) {
                    assertTrue(slotKey(LEVEL_GROUND, x, z) in copies)
                }
            }
            assertEquals(ZoneKey(241, 880, 1), copies.getValue(slotKey(LEVEL_GROUND, limits.minimum - 1, 4)).normalZone())
            assertEquals(ZoneKey(240, 887, 1), copies.getValue(parlour).normalZone())
            assertEquals(2, copies.getValue(parlour).rotation)
            assertEquals(1, copies.getValue(upper).rotation)
            assertFalse(slotKey(LEVEL_DUNGEON, 4, 4) in copies)
        }
    }

    @Test
    fun `older expanded layouts remain visible when limits are lower`() {
        val layout = HouseLayout()
        val slot = slotKey(LEVEL_GROUND, 7, 7)
        layout.place(slot, 1, 3)
        val copies = houseZoneCopies(layout, 1, mapOf(slot to ZoneKey(232, 887, 0)))
        houseTemplate(layout, 1, mapOf(slot to ZoneKey(232, 887, 0)))
        assertEquals(3, copies.getValue(slot).rotation)
        assertTrue(slotKey(LEVEL_GROUND, 8, 8) in copies)
    }
}
