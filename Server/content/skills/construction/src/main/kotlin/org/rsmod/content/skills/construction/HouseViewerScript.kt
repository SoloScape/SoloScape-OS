package org.rsmod.content.skills.construction

import dev.openrune.definition.type.widget.IfEvent
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import org.rsmod.api.player.output.runClientScript
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.ui.ifSetEvents
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.api.script.onIfModalButton
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class HouseViewerScript @Inject constructor(private val catalogue: ConstructionCatalogue) : PluginScript() {
    override fun ScriptContext.startup() {
        onIfModalButton("component.poh_options:viewer") { openViewer() }
        onIfModalButton("component.poh_viewer:portal") {
            val session = player.attr[HouseAccess.SESSION] ?: return@onIfModalButton
            val slot = session.layout.rooms.entries.firstOrNull { (roomSlot, room) ->
                val def = catalogue.room(room.room) ?: return@firstOrNull false
                def.hotspots.any { spot ->
                    val row = session.layout.built(roomSlot, spot.index)
                    spot.builds.any { build -> build.rowId == row &&
                        build.modelObj.internalName == "obj.poh_garden_centrepiece_1" }
                }
            }?.key ?: return@onIfModalButton
            val base = session.region.southWest
            ifClose()
            telejump(org.rsmod.map.CoordGrid(base.x + slotX(slot) * 8 + 3, base.z + slotZ(slot) * 8 + 3, slotLevel(slot)))
        }
        for (button in listOf("move", "rotate", "clockwise", "anticlockwise", "delete", "cancel", "done")) {
            onIfModalButton("component.poh_viewer:$button") {
                mes("The house viewer currently displays your layout. Use doorway hotspots to add or remove rooms.")
            }
        }
    }

    private fun ProtectedAccess.openViewer() {
        val session = player.attr[HouseAccess.SESSION]
        if (session == null) {
            mes("You need to be inside your house to view its layout.")
            return
        }
        val rooms = session.layout.rooms.entries.take(38)
        VarPlayerIntMapSetter.set(player, "varbit.poh_viewer_selectedroom", 0)
        ifOpenMainModal("interface.poh_viewer")
        player.ifSetEvents("component.poh_viewer:portal", -1..-1, IfEvent.Op1)
        for ((index, entry) in rooms.withIndex()) {
            val room = catalogue.room(entry.value.room) ?: continue
            val packed = viewerRoomBits(entry.key, entry.value.rotation, room.row.roomType)
            player.runClientScript("clientscript.[clientscript,poh_viewer_setroom]".asRSCM(RSCMType.CLIENTSCRIPT),
                index + 1, room.id, 0, packed, 0, 0)
        }
        val levels = rooms.map { slotLevel(it.key) }
        val minimum = org.rsmod.map.CoordGrid(
            rooms.minOf { slotX(it.key) }, rooms.minOf { slotZ(it.key) }, levels.minOrNull() ?: LEVEL_GROUND)
        val maximum = org.rsmod.map.CoordGrid(
            rooms.maxOf { slotX(it.key) }, rooms.maxOf { slotZ(it.key) }, (levels.maxOrNull() ?: LEVEL_GROUND).coerceAtMost(2))
        player.runClientScript("clientscript.[clientscript,script1382]".asRSCM(RSCMType.CLIENTSCRIPT), rooms.size, minimum.packed, maximum.packed, LEVEL_GROUND)
    }
}

internal fun viewerRoomBits(slot: Int, rotation: Int, roomType: Int): Int =
    slotX(slot) or (slotZ(slot) shl 3) or (slotLevel(slot) shl 6) or
        (rotation shl 8) or (roomType shl 10)
