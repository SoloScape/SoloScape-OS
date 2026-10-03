package org.rsmod.content.skills.construction

import dev.openrune.ServerCacheManager
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.rsmod.api.repo.region.RegionRepository
import org.rsmod.api.repo.region.RegionTemplate
import org.rsmod.game.region.Region
import org.rsmod.game.region.util.RegionRotations
import org.rsmod.game.region.zone.RegionZoneCopy
import org.rsmod.map.CoordGrid
import org.rsmod.map.zone.ZoneGrid
import org.rsmod.map.zone.ZoneKey

/**
 * Allocates the dynamic region a house lives in. Every placed room is one 8x8 zone copied out of
 * its source chunk at the room's grid slot, rotated to match how the player placed it.
 */
@Singleton
class HouseRegions
@Inject
constructor(private val regionRepo: RegionRepository, private val catalogue: ConstructionCatalogue) {
    fun allocate(layout: HouseLayout, constructionLevel: Int): Region? {
        val sources =
            layout.rooms.mapNotNull { (slot, placed) ->
                val def = catalogue.room(placed.room) ?: return@mapNotNull null
                slot to def.sourceZone
            }.toMap()
        if (sources.isEmpty()) {
            return null
        }
        return regionRepo.add(houseTemplate(layout, constructionLevel, sources))
    }

    fun roomBase(region: Region, slot: Int): CoordGrid =
        CoordGrid(
            region.southWest.x + slotX(slot) * ZoneGrid.LENGTH,
            region.southWest.z + slotZ(slot) * ZoneGrid.LENGTH,
            slotLevel(slot),
        )

    /**
     * Where a hotspot's part ends up once its room is turned.
     *
     * A loc keeps its south-west corner only while it is one tile square. Turn a room holding a 2x1
     * portal and the portal's anchor moves along its own width, so rotating the tile alone lands a
     * tile out - which is why this asks [RegionRotations.translateLoc] for the loc's own footprint
     * rather than [localCoords]. The footprint is swapped when the loc's own angle is a quarter turn.
     */
    fun partCoords(region: Region, slot: Int, rotation: Int, part: HotspotPart): CoordGrid {
        val base = roomBase(region, slot)
        if (rotation == 0) {
            return base.translate(part.localX, part.localZ)
        }
        val type = ServerCacheManager.getObject(part.locId)
        val turned = part.angleId and 1 == 1
        val sizeX = type?.width ?: 1
        val sizeZ = type?.length ?: 1
        val width = if (turned) sizeZ else sizeX
        val length = if (turned) sizeX else sizeZ
        val grid = ZoneGrid(part.localX, part.localZ, 0)
        return base.translate(RegionRotations.translateLoc(rotation, grid, width, length))
    }

    fun localCoords(
        region: Region,
        slot: Int,
        rotation: Int,
        localX: Int,
        localZ: Int,
    ): CoordGrid {
        val base = roomBase(region, slot)
        if (rotation == 0) {
            return base.translate(localX, localZ)
        }
        val grid = ZoneGrid(localX, localZ, 0)
        return base.translate(RegionRotations.translateCoords(rotation, grid))
    }
}

internal fun houseTemplate(
    layout: HouseLayout,
    constructionLevel: Int,
    sources: Map<Int, ZoneKey>,
): RegionTemplate = RegionTemplate.create {
    for ((slot, copy) in houseZoneCopies(layout, constructionLevel, sources)) {
        this[slotX(slot), slotZ(slot), slotLevel(slot)] = copy
    }
}

internal fun houseZoneCopies(
    layout: HouseLayout,
    constructionLevel: Int,
    sources: Map<Int, ZoneKey>,
): Map<Int, RegionZoneCopy> = buildMap {
    val limits = HouseLimits.forLevel(constructionLevel)
    val minimumX = minOf(limits.minimum, layout.rooms.keys.minOfOrNull(::slotX) ?: limits.minimum)
    val maximumX = maxOf(limits.maximum, layout.rooms.keys.maxOfOrNull(::slotX) ?: limits.maximum)
    val minimumZ = minOf(limits.minimum, layout.rooms.keys.minOfOrNull(::slotZ) ?: limits.minimum)
    val maximumZ = maxOf(limits.maximum, layout.rooms.keys.maxOfOrNull(::slotZ) ?: limits.maximum)
    val grass = styledZone(ZoneKey(233, 880, 0), layout.style)
    for (x in (minimumX - 1).coerceAtLeast(0)..maximumX + 1) {
        for (z in (minimumZ - 1).coerceAtLeast(0)..maximumZ + 1) {
            if (slotKey(LEVEL_GROUND, x, z) !in sources) {
                put(slotKey(LEVEL_GROUND, x, z), RegionZoneCopy(grass, rotation = 0, flag = null))
            }
        }
    }
    for ((slot, source) in sources) {
        val placed = layout.rooms.getValue(slot)
        val level = slotLevel(slot)
        val zone = styledZone(source, layout.style, level)
        put(slot, RegionZoneCopy(zone, placed.rotation, flag = null))
    }
}

internal fun styledZone(
    source: ZoneKey,
    style: org.rsmod.content.skills.construction.data.HouseStyle,
    floor: Int = LEVEL_GROUND,
): ZoneKey {
    // Hall stair-top templates sit two zones east of their ground-floor templates.
    val hallTop = floor > LEVEL_GROUND && source.z == 886 && source.x in listOf(233, 237)
    return ZoneKey(source.x - 232 + style.blockZoneX + if (hallTop) 2 else 0, source.z, style.templateLevel)
}
