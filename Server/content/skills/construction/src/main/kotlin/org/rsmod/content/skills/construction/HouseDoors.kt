package org.rsmod.content.skills.construction

import org.rsmod.api.table.PohRoomRow
import org.rsmod.content.skills.construction.data.HouseStyle
import org.rsmod.game.loc.LocInfo

data class HouseDoorTypes(val left: String, val right: String, val leftOpen: String, val rightOpen: String)

internal fun houseRoomHasDoors(room: PohRoomRow): Boolean =
    room.hasRoof != 0 && !room.name.contains("garden") && room.name != "menagerie"

internal fun openHouseDoor(loc: LocInfo, left: Boolean): LocInfo = loc.copy(
    entity = loc.entity.copy(angle = (loc.angleId + if (left) 1 else 3) and 3),
)

fun houseDoorTypes(style: HouseStyle): HouseDoorTypes = when (style) {
    HouseStyle.BASIC_WOOD, HouseStyle.BASIC_STONE, HouseStyle.WHITEWASHED_STONE -> HouseDoorTypes(
        "loc.poordoor_double_inner", "loc.poordoor_doubler_inner",
        "loc.openpoordoor_double_inner", "loc.openpoordoor_doubler_inner",
    )
    HouseStyle.TROPICAL_WOOD -> HouseDoorTypes(
        "loc.timberwall_doorl", "loc.timberwall_door",
        "loc.timberwall_doorl_open", "loc.timberwall_door_open",
    )
    HouseStyle.FREMENNIK_WOOD -> HouseDoorTypes(
        "loc.rellekka_poh_doubledoorl", "loc.rellekka_poh_doubledoor",
        "loc.rellekka_poh_doubledoorl_open", "loc.rellekka_poh_doubledoor_open",
    )
    HouseStyle.FANCY_STONE, HouseStyle.DEATHLY_MANSION -> {
        val prefix = if (style == HouseStyle.FANCY_STONE) "yanille" else "deathly"
        HouseDoorTypes("loc.${prefix}_poh_double_doorl", "loc.${prefix}_poh_double_door",
            "loc.${prefix}_poh_double_doorl_open", "loc.${prefix}_poh_double_door_open")
    }
    HouseStyle.TWISTED, HouseStyle.HOSIDIUS, HouseStyle.CANIFIS -> {
        val prefix = style.doorHotspot
        HouseDoorTypes("loc.${prefix}_poh_doubledoorl", "loc.${prefix}_poh_doubledoor",
            "loc.${prefix}_poh_doubledoorl_open", "loc.${prefix}_poh_doubledoor_open")
    }
    HouseStyle.CIVITAS -> HouseDoorTypes(
        "loc.civitas_poh_door_l", "loc.civitas_poh_door_r",
        "loc.civitas_poh_door_l_open", "loc.civitas_poh_door_r_open",
    )
}.let { it.copy(leftOpen = it.rightOpen, rightOpen = it.leftOpen) }
