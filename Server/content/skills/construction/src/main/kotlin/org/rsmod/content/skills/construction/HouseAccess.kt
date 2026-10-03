package org.rsmod.content.skills.construction

import com.github.michaelbull.logging.InlineLogger
import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.rsmod.api.attr.AttributeKey
import org.rsmod.api.instances.InstanceAttributes
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.stat.baseConstructionLvl
import org.rsmod.api.player.vars.boolVarBit
import org.rsmod.api.repo.loc.LocRepository
import org.rsmod.content.skills.construction.house.HouseStore
import org.rsmod.game.entity.Player
import org.rsmod.game.loc.LocEntity
import org.rsmod.game.loc.LocInfo
import org.rsmod.map.CoordGrid
import org.rsmod.map.zone.ZoneKey

@Singleton
class HouseAccess @Inject constructor(
    private val catalogue: ConstructionCatalogue,
    private val houses: HouseRegions,
    private val locRepo: LocRepository,
    private val houseStore: HouseStore,
) {
    private val logger = InlineLogger()
    private var Player.buildMode by boolVarBit(VARBIT_BUILD_MODE)

    fun enter(access: ProtectedAccess, buildMode: Boolean, portal: String? = null) {
        with(access) { enterHouse(buildMode, portal) }
    }

    fun leave(access: ProtectedAccess) {
        with(access) { leaveHouse() }
    }

    fun clearSession(player: Player) {
        player.attr.remove(SESSION)
        player.attr.remove(InstanceAttributes.LOGIN_EXIT_COORD)
        player.buildMode = false
    }

    fun setBuildMode(access: ProtectedAccess, enabled: Boolean) {
        val previous = access.player.attr[SESSION]
        if (previous == null) {
            access.mes("You need to be inside your house to change building mode.")
            return
        }
        val coords = access.coords
        enter(access, enabled)
        val current = access.player.attr[SESSION] ?: return
        if (current !== previous) {
            access.player.coords = CoordGrid(
                current.region.southWest.x + coords.x - previous.region.southWest.x,
                current.region.southWest.z + coords.z - previous.region.southWest.z,
                coords.level,
            )
        }
    }
    private fun ProtectedAccess.enterHouse(buildMode: Boolean, portal: String? = null) {
        val layout = player.layout()
        if (!layout.owned) {
            mes("You don't own a house yet. Speak to an estate agent to buy one.")
            return
        }
        if (portal != null && portal != layout.location.portal) {
            mes("Your house is in ${layout.location.label}. Use the portal there.")
            return
        }
        if (starterLayout(layout)) {
            player.storeLayout(layout)
        }
        val region = houses.allocate(layout, player.baseConstructionLvl)
        if (region == null) {
            mes("There is no space for your house right now. Try again shortly.")
            return
        }
        val session = HouseSession(region, layout)
        player.attr[SESSION] = session
        player.attr[InstanceAttributes.LOGIN_EXIT_COORD] = layout.location.arrive.packed
        player.buildMode = buildMode
        applyFurniture(session)
        if (!buildMode) applyNormalMode(session, player.houseDoors)
        player.coords = entranceCoords(session)
    }

    private fun ProtectedAccess.leaveHouse() {
        val exit = player.attr[SESSION]?.layout?.location?.arrive ?: player.layout().location.arrive
        clearSession(player)
        player.coords = exit
    }

    private fun starterLayout(layout: HouseLayout): Boolean {
        val garden = catalogue.all().firstOrNull { it.row.name == "garden" } ?: return false
        val parlour = catalogue.all().firstOrNull { it.row.name == "parlour" } ?: return false
        val hotspot = garden.hotspots.firstOrNull { spot ->
            spot.builds.any { it.modelObj.internalName == "obj.poh_garden_centrepiece_1" }
        } ?: return false
        val portal = hotspot.builds.first { it.modelObj.internalName == "obj.poh_garden_centrepiece_1" }
        return layout.ensureStarterLayout(garden.id, parlour.id, hotspot.index, portal.rowId)
    }

    private fun entranceCoords(session: HouseSession): CoordGrid {
        val slot =
            session.layout.rooms.keys.firstOrNull { slotLevel(it) == LEVEL_GROUND }
                ?: session.layout.rooms.keys.first()
        return houses.roomBase(session.region, slot).translate(3, 3)
    }

    private fun applyFurniture(session: HouseSession) {
        for ((slot, placed) in session.layout.rooms) {
            val def = catalogue.room(placed.room) ?: continue
            val window = session.layout.style.window.asRSCM(RSCMType.LOC)
            val dynamicWindow = "loc.poh_dynamic_window".asRSCM(RSCMType.LOC)
            val zone = ZoneKey.from(houses.roomBase(session.region, slot))
            for (loc in locRepo.findAll(zone).filter { it.id == dynamicWindow }.toList()) {
                locRepo.add(loc.copy(entity = loc.entity.copy(id = window)), HOUSE_LOC_DURATION)
            }
            for (hotspot in def.hotspots) {
                val row = session.layout.built(slot, hotspot.index) ?: continue
                spawnFurniture(session, slot, placed.rotation, hotspot, row)
            }
        }
    }

    private fun applyNormalMode(session: HouseSession, doors: Int) {
        val types = houseDoorTypes(session.layout.style)
        for ((slot, placed) in session.layout.rooms) {
            val room = catalogue.room(placed.room) ?: continue
            val zone = ZoneKey.from(houses.roomBase(session.region, slot))
            for (loc in locRepo.findAll(zone).toList()) {
                val type = ServerCacheManager.getObject(loc.id) ?: continue
                if (type.actions.getOpOrNull(4) != "Build") continue
                locRepo.del(loc, HOUSE_LOC_DURATION)
                if (doors == 2 || !houseRoomHasDoors(room.row)) continue
                val door = room.doors.firstOrNull {
                    houses.localCoords(session.region, slot, placed.rotation, it.localX, it.localZ) == loc.coords
                } ?: continue
                val direction = (door.direction + placed.rotation) and 3
                val adjacent = neighbour(slot, direction)?.let(session.layout::placed) ?: continue
                val adjacentRoom = catalogue.room(adjacent.room) ?: continue
                if (((direction + 2) and 3) !in adjacentRoom.doorsAfter(adjacent.rotation)) continue
                val left = type.internalName.contains("doorl_")
                val closed = if (left) types.left else types.right
                val opened = if (left) types.leftOpen else types.rightOpen
                val panel = loc.copy(entity = loc.entity.copy(id = (if (doors == 1) opened else closed).asRSCM()))
                locRepo.add(if (doors == 1) openHouseDoor(panel, left) else panel, HOUSE_LOC_DURATION)
            }
        }
    }

    fun spawnFurniture(
        session: HouseSession,
        slot: Int,
        rotation: Int,
        hotspot: HotspotDef,
        furnitureRow: Int,
    ) {
        for (loc in builtLocs(session, slot, rotation, hotspot, furnitureRow)) {
            locRepo.add(loc, duration = HOUSE_LOC_DURATION)
        }
    }

    fun despawnFurniture(session: HouseSession, target: HotspotTarget, furnitureRow: Int) {
        val locs =
            builtLocs(session, target.slot, target.rotation, target.hotspot, furnitureRow)
        for (loc in locs) {
            locRepo.del(loc, duration = HOUSE_LOC_DURATION)
        }
    }

    /**
     * A multi-tile piece covers every part of its hotspot, each with the loc for that part, so a rug
     * lays its corners and sides rather than one tile at the hotspot's anchor.
     */
    private fun builtLocs(
        session: HouseSession,
        slot: Int,
        rotation: Int,
        hotspot: HotspotDef,
        furnitureRow: Int,
    ): List<LocInfo> {
        val furniture = hotspot.builds.firstOrNull { it.rowId == furnitureRow } ?: return emptyList()
        if (catalogue.builtLocIds(furniture).isEmpty()) {
            logger.warn { "Furniture '${furniture.name}' has no matching loc to place." }
            return emptyList()
        }
        val variant = session.layout.variant(slot, hotspot.index)
        return hotspot.parts.mapNotNull { part ->
            val locId = variant ?: catalogue.builtLocFor(furniture, part) ?: return@mapNotNull null
            val coords = houses.partCoords(session.region, slot, rotation, part)
            LocInfo(
                part.layer,
                coords,
                LocEntity(locId, part.shapeId, (part.angleId + rotation) and 3),
            )
        }
    }

    private fun Player.layout(): HouseLayout = houseStore.state(this)

    private fun Player.storeLayout(layout: HouseLayout) { houseStore.save(this, layout) }

    companion object {
        const val HOUSE_LOC_DURATION = Int.MAX_VALUE
        val SESSION: AttributeKey<HouseSession> = AttributeKey(temp = true)
    }
}
