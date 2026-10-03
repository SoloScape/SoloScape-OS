package org.rsmod.content.skills.construction

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.parallel.ResourceLock
import org.rsmod.api.registry.controller.ControllerRegistry
import org.rsmod.api.registry.loc.LocRegistryNormal
import org.rsmod.api.registry.loc.LocRegistryRegion
import org.rsmod.api.registry.loc.isSuccess
import org.rsmod.api.registry.npc.NpcRegistry
import org.rsmod.api.registry.region.RegionRegistry
import org.rsmod.api.registry.region.RegionRegistryResult
import org.rsmod.api.registry.zone.ZonePlayerActivityBitSet
import org.rsmod.api.registry.zone.ZoneUpdateMap
import org.rsmod.api.registry.zone.ZoneUpdateTransformer
import org.rsmod.content.skills.construction.data.HouseStyle
import org.rsmod.events.EventBus
import org.rsmod.game.MapClock
import org.rsmod.game.entity.ControllerList
import org.rsmod.game.entity.NpcList
import org.rsmod.game.loc.LocEntity
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.loc.LocZoneKey
import org.rsmod.game.map.LocZoneStorage
import org.rsmod.game.region.RegionListLarge
import org.rsmod.game.region.RegionListSmall
import org.rsmod.game.region.RegionListWorldEntity
import org.rsmod.game.region.util.RegionRotations
import org.rsmod.game.region.zone.RegionZoneCopy
import org.rsmod.map.CoordGrid
import org.rsmod.map.zone.ZoneGrid
import org.rsmod.map.zone.ZoneKey
import org.rsmod.routefinder.collision.CollisionFlagMap

@ResourceLock("ServerCacheManager")
class HouseDoorsCacheTest {
    @Test
    fun `instanced room doors use rotated angles and keep hotspots hidden when moved`() {
        ServerCacheManager.init(240).close()
        for (style in HouseStyle.entries) for (rotation in 0..3) for (left in listOf(true, false)) {
            val storage = LocZoneStorage()
            val collision = CollisionFlagMap()
            val updates = ZoneUpdateMap()
            val normal = LocRegistryNormal(updates, collision, storage)
            val regions = RegionRegistry(
                RegionListSmall(), RegionListLarge(), RegionListWorldEntity(), normal,
                collision, storage, NpcRegistry(NpcList(), collision, EventBus()),
                ControllerRegistry(MapClock(), ControllerList()), ZonePlayerActivityBitSet(),
            )
            val region = (regions.registerSmall() as RegionRegistryResult.Add.Success).region
            val source = CoordGrid(3200, 3200)
            val localZ = if (left) 4 else 3
            val hotspot = LocInfo(0, source.translate(0, localZ), LocEntity(
                (if (left) style.doorLeft else style.doorRight).asRSCM(), 0, 0,
            ))
            storage.mapLocs[ZoneKey.from(source), LocZoneKey(ZoneGrid.from(hotspot.coords), 0)] = hotspot.entity
            val zone = ZoneKey.from(region.southWest)
            regions.registerZone(region, zone, RegionZoneCopy(ZoneKey.from(source), rotation, null))
            val coords = region.southWest.translate(
                RegionRotations.translateCoords(rotation, ZoneGrid(0, localZ, 0)),
            )
            val expected = hotspot.copy(coords = coords, entity = hotspot.entity.copy(angle = rotation))
            val registry = LocRegistryRegion(updates, collision, storage, regions)
            assertEquals(expected, registry.findShape(coords, 0), "rotation=$rotation")
            assertTrue(registry.del(expected).isSuccess(), "Cannot hide rotated hotspot: $rotation")
            assertNull(registry.findShape(coords, 0))
            registry.add(expected)
            assertEquals(ZoneUpdateTransformer.toLocAddChangeProt(expected),
                updates.updatedZones[zone.packed]!!.protList.last(), "Restored angle: $rotation")
            assertEquals(expected, registry.findType(coords, expected.id))
            assertTrue(registry.del(expected).isSuccess())
            val types = houseDoorTypes(style)
            val closed = expected.copy(entity = expected.entity.copy(
                id = (if (left) types.left else types.right).asRSCM(),
            ))
            val opened = houseDoorDestination(closed, types, left, true)
            registry.add(closed)
            repeat(3) {
                moveHouseDoor(closed, opened,
                    { at, shape -> registry.findShape(at, shape.id) },
                    { assertTrue(registry.del(it).isSuccess()) }, { registry.add(it) })
                assertEquals(opened, registry.findShape(coords, 0), "Hotspot revealed: rotation=$rotation")
                assertEquals(opened, registry.findShape(opened.coords, 0))
                moveHouseDoor(opened, closed,
                    { at, shape -> registry.findShape(at, shape.id) },
                    { assertTrue(registry.del(it).isSuccess()) }, { registry.add(it) })
                assertEquals(closed, registry.findShape(coords, 0))
            }
        }
    }

    @Test
    fun `opening and closing either door keeps underlying build hotspots hidden in every style and rotation`() {
        ServerCacheManager.init(240).close()
        val collision = CollisionFlagMap()
        for (style in HouseStyle.entries) for (angle in 0..3) for (left in listOf(true, false)) {
            val types = houseDoorTypes(style)
            val storage = LocZoneStorage()
            val registry = LocRegistryNormal(ZoneUpdateMap(), collision, storage)
            val coords = CoordGrid(3203, 3203)
            val hotspot = LocInfo(0, coords, LocEntity(
                (if (left) style.doorLeft else style.doorRight).asRSCM(), 0, angle,
            ))
            storage.mapLocs[ZoneKey.from(coords), LocZoneKey(ZoneGrid.from(coords), hotspot.layer)] = hotspot.entity
            val closed = hotspot.copy(entity = hotspot.entity.copy(id = (if (left) types.left else types.right).asRSCM()))
            val opened = houseDoorDestination(closed, types, left, true)
            assertEquals(closed, houseDoorDestination(opened, types, left, false))
            registry.del(hotspot)
            registry.add(closed)

            registry.del(closed)
            assertEquals(hotspot, registry.findShape(coords, hotspot.shapeId), "Fixture must reproduce the revealed hotspot")
            registry.del(hotspot)
            registry.add(closed)

            repeat(3) {
                moveHouseDoor(closed, opened,
                    { at, shape -> registry.findShape(at, shape.id) },
                    { registry.del(it) }, { registry.add(it) })
                assertEquals(opened, registry.findShape(coords, hotspot.shapeId), "$style angle=$angle left=$left")
                assertEquals(opened, registry.findShape(opened.coords, opened.shapeId))
                assertTrue(registry.findAll(ZoneKey.from(coords)).none {
                    ServerCacheManager.getObject(it.id)?.actions?.getOpOrNull(4) == "Build"
                })
                moveHouseDoor(opened, closed,
                    { at, shape -> registry.findShape(at, shape.id) },
                    { registry.del(it) }, { registry.add(it) })
                assertEquals(closed, registry.findShape(coords, closed.shapeId))
                assertEquals(closed, registry.findShape(opened.coords, opened.shapeId))
            }
        }
    }
}
