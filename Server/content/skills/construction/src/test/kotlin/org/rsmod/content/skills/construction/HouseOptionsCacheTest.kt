package org.rsmod.content.skills.construction

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.types.varp.VarpLifetime
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.parallel.ResourceLock
import org.rsmod.api.table.PohRoomRow
import org.rsmod.content.skills.construction.data.HouseStyle
import org.rsmod.game.entity.Player

@ResourceLock("ServerCacheManager")
class HouseOptionsCacheTest {
    @Test
    fun `options bind real buttons and preserve independent persistent preferences`() {
        ServerCacheManager.init(240).close()
        val options = checkNotNull(ServerCacheManager.getInterface("interface.poh_options".asRSCM()))
        assertTrue(houseRoomHasDoors(PohRoomRow.all().first { it.name == "parlour" }))
        assertEquals(false, houseRoomHasDoors(PohRoomRow.all().first { it.name == "garden" }))
        val names = options.components.values.map { it.internalName }.toSet()
        for (button in listOf("viewer", "build_mode_on", "build_mode_off", "tele_on", "tele_off",
            "default_build_mode_on", "default_build_mode_off", "doors_closed", "icon_doors_closed",
            "doors_open", "icon_doors_open", "doors_none", "icon_doors_none", "leave_house",
            "expel_guests", "call_servant", "roomcount")) {
            assertTrue(button in names, "Missing house options component: $button")
            "component.poh_options:$button".asRSCM()
        }
        val player = Player()
        assertEquals(false, player.houseTeleportOutside)
        assertEquals(false, player.houseTeleportBuildMode)
        player.houseDoors = 2
        player.houseTeleportOutside = true
        player.houseTeleportBuildMode = true
        assertEquals(2, player.houseDoors)
        assertEquals(true, player.houseTeleportOutside)
        assertEquals(true, player.houseTeleportBuildMode)
        player.houseTeleportOutside = false
        assertEquals(2, player.houseDoors)
        assertEquals(true, player.houseTeleportBuildMode)
        for (name in listOf("poh_tele_toggle", "poh_doors_option", "poh_teleport_building_mode")) {
            val bit = checkNotNull(ServerCacheManager.getVarbit("varbit.$name".asRSCM()))
            assertEquals(VarpLifetime.Perm, ServerCacheManager.getVarp(bit.varp)?.scope)
        }
        for (style in HouseStyle.entries) {
            val doors = houseDoorTypes(style)
            for (name in listOf(doors.left, doors.right)) {
                assertEquals("Open", ServerCacheManager.getObject(name.asRSCM())?.actions?.getOpOrNull(0), name)
            }
            for (name in listOf(doors.leftOpen, doors.rightOpen)) {
                assertEquals("Close", ServerCacheManager.getObject(name.asRSCM())?.actions?.getOpOrNull(0), name)
            }
        }
    }
}
