package org.rsmod.content.skills.construction

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import jakarta.inject.Inject
import org.rsmod.api.config.refs.params
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.repo.loc.LocRepository
import org.rsmod.api.script.onOpLoc1
import org.rsmod.content.generic.locs.doors.DoorTranslations
import org.rsmod.content.generic.locs.doors.DoubleDoorScript
import org.rsmod.content.skills.construction.data.HouseStyle
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.loc.LocShape
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class HouseDoorScript @Inject constructor(
    private val locRepo: LocRepository,
    private val doubleDoors: DoubleDoorScript,
) : PluginScript() {
    override fun ScriptContext.startup() {
        for (types in HouseStyle.entries.map(::houseDoorTypes).distinct()) {
            onOpLoc1(types.left) { toggleDoor(it.loc, types, true, true) }
            onOpLoc1(types.right) { toggleDoor(it.loc, types, false, true) }
            onOpLoc1(types.leftOpen) { toggleDoor(it.loc, types, true, false) }
            onOpLoc1(types.rightOpen) { toggleDoor(it.loc, types, false, false) }
        }
    }

    private fun ProtectedAccess.toggleDoor(bound: BoundLocInfo, types: HouseDoorTypes, left: Boolean, opening: Boolean) {
        val loc = LocInfo(bound.layer, bound.coords, bound.entity)
        val type = ServerCacheManager.getObject(loc.id) ?: return
        if (player.attr[HouseAccess.SESSION] == null) {
            doubleDoors.operate(this, bound, type)
            return
        }
        soundSynth(type.param(if (opening) params.opensound else params.closesound))
        val partnerCoords = houseDoorPartnerCoords(loc, left, opening)
        val partnerId = when {
            opening && left -> types.right
            opening -> types.left
            left -> types.rightOpen
            else -> types.leftOpen
        }.asRSCM()
        val partner = locRepo.findExact(partnerCoords, loc.shape)?.takeIf { it.id == partnerId }
        moveDoor(loc, houseDoorDestination(loc, types, left, opening))
        if (partner != null) moveDoor(partner, houseDoorDestination(partner, types, !left, opening))
    }

    private fun moveDoor(from: LocInfo, to: LocInfo) {
        moveHouseDoor(from, to, { coords, shape -> locRepo.findExact(coords, shape) },
            { locRepo.del(it, HouseAccess.HOUSE_LOC_DURATION) },
            { locRepo.add(it, HouseAccess.HOUSE_LOC_DURATION) })
    }
}

internal fun houseDoorPartnerCoords(loc: LocInfo, left: Boolean, opening: Boolean): CoordGrid = when {
    opening && left -> DoorTranslations.translateCloseOpposite(loc.coords, loc.shape, loc.angle)
    opening -> DoorTranslations.translateClose(loc.coords, loc.shape, loc.angle)
    else -> DoorTranslations.translateOpenOpposite(loc.coords, loc.shape, loc.angle)
}

internal fun houseDoorDestination(loc: LocInfo, types: HouseDoorTypes, left: Boolean, opening: Boolean): LocInfo {
    val id = when {
        opening && left -> types.leftOpen
        opening -> types.rightOpen
        left -> types.left
        else -> types.right
    }.asRSCM()
    if (opening) return openHouseDoor(loc.copy(entity = loc.entity.copy(id = id)), left)
    val rotation = if (left) 3 else 1
    return loc.copy(entity = loc.entity.copy(id = id, angle = (loc.angleId + rotation) and 3))
}

internal fun moveHouseDoor(
    from: LocInfo,
    to: LocInfo,
    find: (CoordGrid, LocShape) -> LocInfo?,
    delete: (LocInfo) -> Unit,
    add: (LocInfo) -> Unit,
) {
    delete(from)
    val revealed = find(from.coords, from.shape)
    if (revealed != null && ServerCacheManager.getObject(revealed.id)?.actions?.getOpOrNull(4) == "Build") {
        delete(revealed)
    }
    add(to)
}
