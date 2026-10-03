package org.rsmod.content.skills.construction

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.rsmod.content.skills.construction.data.HouseLocation
import org.rsmod.content.skills.construction.data.HouseStyle
import org.rsmod.map.zone.ZoneKey

class HouseLayoutTest {
    @Test
    fun `new starter house includes a saved exit portal and parlour`() {
        val layout = HouseLayout(owned = true)
        assertEquals(true, layout.ensureStarterLayout(1, 2, 0, 3))
        val saved = HouseLayout.decode(layout.encode())
        assertEquals(PlacedRoom(1, 0), saved.placed(slotKey(LEVEL_GROUND, 4, 4)))
        assertEquals(PlacedRoom(2, 0), saved.placed(slotKey(LEVEL_GROUND, 4, 5)))
        assertEquals(3, saved.built(slotKey(LEVEL_GROUND, 4, 4), 0))
        assertEquals(false, saved.ensureStarterLayout(1, 2, 0, 3))
    }

    @Test
    fun `legacy starter garden gains an exit without losing its rotation or furniture`() {
        val garden = slotKey(LEVEL_GROUND, 4, 4)
        val layout = HouseLayout(owned = true)
        layout.place(garden, 1, rotation = 2)
        layout.build(garden, 1, 4)
        val saved = HouseLayout.decode(layout.encode())
        assertEquals(true, saved.ensureStarterLayout(1, 2, 0, 3))
        val repaired = HouseLayout.decode(saved.encode())
        assertEquals(PlacedRoom(1, 2), repaired.placed(garden))
        assertEquals(3, repaired.built(garden, 0))
        assertEquals(4, repaired.built(garden, 1))
        assertEquals(PlacedRoom(2, 0), repaired.placed(slotKey(LEVEL_GROUND, 4, 5)))
    }

    @Test
    fun `starter repair preserves chosen centrepieces and expanded houses`() {
        val garden = slotKey(LEVEL_GROUND, 4, 4)
        val layout = HouseLayout(owned = true)
        layout.place(garden, 1, rotation = 0)
        layout.build(garden, 0, 4, variant = 5)
        val original = layout.encode()
        assertEquals(false, layout.ensureStarterLayout(1, 2, 0, 3))
        assertEquals(original, layout.encode())
        layout.demolish(garden, 0)
        layout.place(slotKey(LEVEL_GROUND, 4, 5), 6, rotation = 1)
        val expanded = layout.encode()
        assertEquals(false, layout.ensureStarterLayout(1, 2, 0, 3))
        assertEquals(expanded, layout.encode())
    }

    @Test
    fun `estate settings survive layout saves`() {
        val layout = HouseLayout(owned = true, location = HouseLocation.YANILLE, style = HouseStyle.FANCY_STONE)
        val decoded = HouseLayout.decode(layout.encode())
        assertEquals(true, decoded.owned)
        assertEquals(HouseLocation.YANILLE, decoded.location)
        assertEquals(HouseStyle.FANCY_STONE, decoded.style)
    }

    @Test
    fun `older donor layouts remain owned and retain their rooms`() {
        val layout = HouseLayout.decode("1|${slotKey(LEVEL_GROUND, 4, 4)}:4166:0|")
        assertEquals(true, layout.owned)
        assertNotNull(layout.placed(slotKey(LEVEL_GROUND, 4, 4)))
    }

    @Test
    fun `styles select the matching template block and plane`() {
        val source = ZoneKey(233, 882, 0)
        assertEquals(ZoneKey(233, 882, 0), styledZone(source, HouseStyle.BASIC_WOOD))
        assertEquals(ZoneKey(241, 882, 1), styledZone(source, HouseStyle.FANCY_STONE))
        assertEquals(ZoneKey(249, 882, 3), styledZone(source, HouseStyle.CANIFIS))
    }

    @Test
    fun `stairs create a rotated upper room with a return staircase`() {
        val layout = HouseLayout()
        val lower = slotKey(LEVEL_GROUND, 4, 5)
        val upper = slotKey(LEVEL_GROUND + 1, 4, 5)
        layout.place(lower, room = 4166, rotation = 2)
        layout.raiseFloor(lower, hotspot = 3, row = 6031, returnLoc = 123)
        val saved = HouseLayout.decode(layout.encode())
        assertEquals(saved.placed(lower), saved.placed(upper))
        assertEquals(6031, saved.built(upper, 3))
        assertEquals(123, saved.variant(upper, 3))
        assertEquals(ZoneKey(243, 886, 1), styledZone(ZoneKey(233, 886, 0), HouseStyle.FANCY_STONE, LEVEL_GROUND + 1))
    }

    @Test
    fun `stairs do not replace existing upper furniture or exceed the house height`() {
        val layout = HouseLayout()
        val top = slotKey(HOUSE_LEVELS - 1, 4, 5)
        layout.place(top, room = 4166, rotation = 0)
        layout.raiseFloor(top, 3, 6031, 123)
        assertEquals(1, layout.rooms.size)
        val lower = slotKey(LEVEL_GROUND, 4, 5)
        val upper = slotKey(LEVEL_GROUND + 1, 4, 5)
        layout.place(lower, 4166, 0)
        layout.place(upper, 4167, 1)
        layout.build(upper, 3, 6032)
        layout.raiseFloor(lower, 3, 6031, 123)
        assertEquals(PlacedRoom(4167, 1), layout.placed(upper))
        assertEquals(6032, layout.built(upper, 3))
    }

    @Test
    fun `round trips rooms and furniture`() {
        val layout = HouseLayout()
        layout.place(slotKey(LEVEL_GROUND, 4, 4), room = 4166, rotation = 2)
        layout.place(slotKey(LEVEL_GROUND, 4, 5), room = 4167, rotation = 0)
        layout.build(slotKey(LEVEL_GROUND, 4, 4), hotspot = 3, row = 6031)

        val decoded = HouseLayout.decode(layout.encode())

        assertEquals(layout.rooms, decoded.rooms)
        assertEquals(layout.furniture, decoded.furniture)
        assertEquals(6031, decoded.built(slotKey(LEVEL_GROUND, 4, 4), 3))
    }

    @Test
    fun `empty and malformed input decodes to an empty house`() {
        assertEquals(0, HouseLayout.decode(null).rooms.size)
        assertEquals(0, HouseLayout.decode("").rooms.size)
        assertEquals(0, HouseLayout.decode("9|4:1:0|").rooms.size)
    }

    @Test
    fun `removing a room drops its furniture`() {
        val slot = slotKey(LEVEL_GROUND, 2, 2)
        val layout = HouseLayout()
        layout.place(slot, room = 4166, rotation = 0)
        layout.build(slot, hotspot = 0, row = 6030)
        layout.place(slotKey(LEVEL_GROUND, 2, 3), room = 4166, rotation = 0)
        layout.build(slotKey(LEVEL_GROUND, 2, 3), hotspot = 0, row = 6030)

        layout.remove(slot)

        assertNull(layout.built(slot, 0))
        assertEquals(6030, layout.built(slotKey(LEVEL_GROUND, 2, 3), 0))
    }

    @Test
    fun `a room holding up the house cannot be removed`() {
        val layout = HouseLayout()
        val garden = slotKey(LEVEL_GROUND, 4, 4)
        val parlour = slotKey(LEVEL_GROUND, 4, 5)
        val bedroom = slotKey(LEVEL_GROUND + 1, 4, 5)
        layout.place(garden, room = 1, rotation = 0)
        assertNotNull(layout.removalRefusal(garden), "the only ground floor room came out")
        assertNotNull(layout.removalRefusal(parlour), "an empty slot came out")

        layout.place(parlour, room = 2, rotation = 0)
        layout.place(bedroom, room = 3, rotation = 0)
        assertNotNull(layout.removalRefusal(parlour), "a room with a room above it came out")
        assertNull(layout.removalRefusal(bedroom))
        assertNull(layout.removalRefusal(garden))
    }

    @Test
    fun `furniture for an unknown room is dropped on decode`() {
        val slot = slotKey(LEVEL_GROUND, 1, 1)
        val decoded = HouseLayout.decode("1||$slot:0:6030")

        assertNull(decoded.built(slot, 0))
    }

    @Test
    fun `slot packing survives every grid position`() {
        for (level in 0 until HOUSE_LEVELS) {
            for (x in 0 until HOUSE_GRID) {
                for (z in 0 until HOUSE_GRID) {
                    val slot = slotKey(level, x, z)
                    assertEquals(level, slotLevel(slot))
                    assertEquals(x, slotX(slot))
                    assertEquals(z, slotZ(slot))
                }
            }
        }
    }

    @Test
    fun `neighbours stay inside the grid`() {
        val corner = slotKey(LEVEL_GROUND, 0, 0)
        assertNull(neighbour(corner, 2))
        assertNull(neighbour(corner, 3))
        assertEquals(slotKey(LEVEL_GROUND, 0, 1), neighbour(corner, 0))
        assertEquals(slotKey(LEVEL_GROUND, 1, 0), neighbour(corner, 1))
    }
}
