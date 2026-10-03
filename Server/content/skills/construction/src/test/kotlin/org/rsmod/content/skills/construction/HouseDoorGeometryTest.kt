package org.rsmod.content.skills.construction

import dev.openrune.ServerCacheManager
import dev.openrune.cache.MAPS
import dev.openrune.map.loc.MapLocDefinition
import dev.openrune.map.loc.MapLocListDecoder
import dev.openrune.map.util.InlineByteBuf
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.parallel.ResourceLock
import org.rsmod.content.skills.construction.data.HouseStyle
import org.rsmod.game.loc.LocEntity
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.region.util.RegionRotations
import org.rsmod.map.CoordGrid
import org.rsmod.map.zone.ZoneGrid

@ResourceLock("ServerCacheManager")
class HouseDoorGeometryTest {
    @Test
    fun `either panel finds its partner before opening and closing on every wall`() {
        val left = LocInfo(0, CoordGrid(0, 4, 0), LocEntity(1, 0, 0))
        val right = LocInfo(0, CoordGrid(0, 3, 0), LocEntity(2, 0, 0))
        for (rotation in 0..3) {
            val rotatedLeft = rotate(left, rotation)
            val rotatedRight = rotate(right, rotation)
            assertEquals(rotatedRight.coords, houseDoorPartnerCoords(rotatedLeft, true, true))
            assertEquals(rotatedLeft.coords, houseDoorPartnerCoords(rotatedRight, false, true))
            val openedLeft = openHouseDoor(rotatedLeft, true)
            val openedRight = openHouseDoor(rotatedRight, false)
            assertEquals(openedRight.coords, houseDoorPartnerCoords(openedLeft, true, false))
            assertEquals(openedLeft.coords, houseDoorPartnerCoords(openedRight, false, false))
        }
    }

    @Test
    fun `panels swing from outer hinges into the room for every wall`() {
        val left = LocInfo(0, CoordGrid(0, 4, 0), LocEntity(1, 0, 0))
        val right = LocInfo(0, CoordGrid(0, 3, 0), LocEntity(2, 0, 0))
        val openedLeft = left.copy(entity = left.entity.copy(angle = 1))
        val openedRight = right.copy(entity = right.entity.copy(angle = 3))
        for (rotation in 0..3) {
            assertEquals(rotate(openedLeft, rotation), openHouseDoor(rotate(left, rotation), left = true))
            assertEquals(rotate(openedRight, rotation), openHouseDoor(rotate(right, rotation), left = false))
        }
    }

    @Test
    fun `real house doorway panels remain in their own room across styles and rotations`() {
        val cache = ServerCacheManager.init(240)
        try {
            for (style in HouseStyle.entries) {
                val group = ((style.blockZoneX / 8) shl 8) or 110
                val spawns = MapLocListDecoder.decode(InlineByteBuf(checkNotNull(cache.data(MAPS, group, 1))))
                val doors = spawns.spawns.map { MapLocDefinition(it) }.filter {
                    it.level == style.templateLevel && it.localX / 8 == 2 && it.localZ / 8 == 1 &&
                        HotspotNaming.isDoor(checkNotNull(ServerCacheManager.getObject(it.id)).internalName)
                }
                assertEquals(8, doors.size, style.name)
                for (door in doors) {
                    val name = checkNotNull(ServerCacheManager.getObject(door.id)).internalName
                    val left = name.contains("doorl_")
                    val panel = LocInfo(0, CoordGrid(door.localX % 8, door.localZ % 8, 0), LocEntity(door.id, door.shape, door.angle))
                    for (rotation in 0..3) {
                        val opened = openHouseDoor(rotate(panel, rotation), left)
                        assertEquals(rotate(panel, rotation).coords, opened.coords,
                            "$name at rotation $rotation moves away from its doorway")
                    }
                }
            }
        } finally {
            cache.close()
        }
    }

    private fun rotate(loc: LocInfo, rotation: Int): LocInfo = loc.copy(
        coords = CoordGrid(0, 0, 0).translate(RegionRotations.translateCoords(rotation, ZoneGrid(loc.coords.x, loc.coords.z, 0))),
        entity = loc.entity.copy(angle = (loc.angleId + rotation) and 3),
    )
}
