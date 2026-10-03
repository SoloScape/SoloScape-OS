package org.rsmod.content.skills.construction

import dev.openrune.ServerCacheManager
import dev.openrune.cache.MAPS
import dev.openrune.map.loc.MapLocDefinition
import dev.openrune.map.loc.MapLocListDecoder
import dev.openrune.map.tile.MapTileDecoder
import dev.openrune.map.tile.MapTileSimpleDefinition
import dev.openrune.map.util.InlineByteBuf
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.parallel.ResourceLock
import org.rsmod.content.skills.construction.data.HouseStyle

@ResourceLock("ServerCacheManager")
class HouseYardCacheTest {
    @Test
    fun `every house style has walkable outdoor terrain without room hotspots`() {
        val cache = ServerCacheManager.init(240)
        try {
            for (style in HouseStyle.entries) {
                val group = ((style.blockZoneX / 8) shl 8) or 110
                val terrain = MapTileDecoder.decode(InlineByteBuf(checkNotNull(cache.data(MAPS, group, 0))))
                val spawns = MapLocListDecoder.decode(InlineByteBuf(checkNotNull(cache.data(MAPS, group, 1))))
                val locs = spawns.spawns.map { MapLocDefinition(it) }.filter {
                    it.level == style.templateLevel && it.localX / 8 == 1 && it.localZ / 8 == 0
                }
                val names = locs.map { checkNotNull(ServerCacheManager.getObject(it.id)).internalName }
                println("${style.name} outdoor scenery: ${names.distinct()}")
                assertTrue(names.none {
                    HotspotNaming.isDoor(it) || HotspotNaming.isNamedHotspot(it) || HotspotNaming.slotOf(it) != null
                }, "${style.name} contains a room hotspot: $names")
                for (x in 8..15) for (z in 0..7) {
                    val flags = terrain[x, z, style.templateLevel].toInt()
                    assertTrue(flags and MapTileSimpleDefinition.COLOURED != 0, "${style.name}: $x,$z has no terrain")
                    assertEquals(0, flags and MapTileSimpleDefinition.BLOCK_MAP_SQUARE, "${style.name}: $x,$z is blocked")
                }
            }
        } finally {
            cache.close()
        }
    }
}
