package org.rsmod.content.skills.construction

import com.github.michaelbull.logging.InlineLogger
import dev.openrune.ServerCacheManager
import dev.openrune.definition.type.widget.IfEvent
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import org.rsmod.api.player.output.mes
import org.rsmod.api.player.output.runClientScript
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.protect.ProtectedAccessLauncher
import org.rsmod.api.player.stat.baseConstructionLvl
import org.rsmod.api.player.stat.constructionLvl
import org.rsmod.api.player.ui.ifOpenMainModal
import org.rsmod.api.player.ui.ifSetEvents
import org.rsmod.api.player.ui.ifSetHide
import org.rsmod.api.player.ui.ifSetPosition
import org.rsmod.api.player.ui.ifSetText
import org.rsmod.api.player.vars.boolVarBit
import org.rsmod.api.repo.loc.LocRepository
import org.rsmod.api.script.onCommand
import org.rsmod.api.script.onIfModalButton
import org.rsmod.api.script.onIfOpen
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpLoc2
import org.rsmod.api.script.onOpLoc3
import org.rsmod.api.script.onOpLoc5
import org.rsmod.api.script.onPlayerLogin
import org.rsmod.api.script.onPlayerQueueWithArgs
import org.rsmod.api.stats.xpmod.XpModifiers
import org.rsmod.api.table.FurnitureRow
import org.rsmod.content.skills.construction.data.HouseStyle
import org.rsmod.content.skills.construction.house.HouseStore
import org.rsmod.game.cheat.Cheat
import org.rsmod.game.entity.Player
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class ConstructionScript
@Inject
constructor(
    private val catalogue: ConstructionCatalogue,
    private val houses: HouseRegions,
    private val locRepo: LocRepository,
    private val xpMods: XpModifiers,
    private val protectedAccess: ProtectedAccessLauncher,
    private val houseStore: HouseStore,
    private val houseAccess: HouseAccess,
) : PluginScript() {
    private val logger = InlineLogger()

    private var Player.buildMode by boolVarBit(VARBIT_BUILD_MODE)

    override fun ScriptContext.startup() {
        onPlayerLogin { player.buildMode = false }
        onIfOpen("interface.poh_options") {
            player.syncHouseOptions()
            player.ifSetPosition("component.poh_options:icon_doors_none", 143, 123)
            player.ifSetText("component.poh_options:roomcount", "Rooms: ${player.layout().rooms.size}")
            player.ifSetEvents("component.poh_options:viewer", 0..20, IfEvent.Op1)
            player.ifSetEvents("component.poh_options:expel_guests", 0..20, IfEvent.Op1)
            player.ifSetEvents("component.poh_options:leave_house", 0..20, IfEvent.Op1)
            player.ifSetEvents("component.poh_options:call_servant", 0..20, IfEvent.Op1)
        }
        onIfModalButton("component.poh_options:build_mode_on") { houseAccess.setBuildMode(this, true) }
        onIfModalButton("component.poh_options:build_mode_off") { houseAccess.setBuildMode(this, false) }
        onIfModalButton("component.poh_options:tele_on") { player.houseTeleportOutside = false }
        onIfModalButton("component.poh_options:tele_off") { player.houseTeleportOutside = true }
        onIfModalButton("component.poh_options:default_build_mode_on") { player.houseTeleportBuildMode = true }
        onIfModalButton("component.poh_options:default_build_mode_off") {
            player.houseTeleportBuildMode = false
            player.syncHouseOptions()
        }
        for ((suffix, value) in listOf("closed" to 0, "open" to 1, "none" to 2)) {
            for (component in listOf("doors_$suffix", "icon_doors_$suffix")) {
                onIfModalButton("component.poh_options:$component") {
                    player.houseDoors = value
                    if (player.attr[SESSION] != null) houseAccess.setBuildMode(this, player.buildMode)
                }
            }
        }
        onIfModalButton("component.poh_options:leave_house") {
            if (player.attr[SESSION] == null) mes("You are not inside a house.") else leaveHouse()
        }
        onIfModalButton("component.poh_options:expel_guests") {
            mes("There are no guests to expel. House visits are not available yet.")
        }
        onIfModalButton("component.poh_options:call_servant") {
            mes("You do not have a servant. House servants are not available yet.")
        }

        for (portal in TOWN_PORTALS) {
            onOpLoc1(portal) { enterHouse(buildMode = false, portal = portal) }
            onOpLoc2(portal) { enterHouse(buildMode = true, portal = portal) }
        }
        onOpLoc1(EXIT_PORTAL) { leaveHouse() }

        // Every house hotspot, doorway and built piece carries its option at op5: a hotspot is
        // `ops=[4=Build]` and a built piece `ops=[.., 4=Remove]`. Binding op1 never fires, and
        // binding Remove to the hotspot's op5 eats the Build click instead.
        val doorIds = catalogue.doorLocIds() + HouseStyle.entries.flatMap {
            listOf(it.doorLeft.asRSCM(RSCMType.LOC), it.doorRight.asRSCM(RSCMType.LOC))
        }
        val styleHotspots = ServerCacheManager.getObjects().filter { (id, type) ->
            id !in doorIds && type.actions.getOpOrNull(4) == "Build" &&
                type.internalName.startsWith("loc.poh_hotspot_")
        }.keys
        for (locId in catalogue.hotspotLocIds() + styleHotspots) {
            val type = ServerCacheManager.getObject(locId) ?: continue
            onOpLoc5(type) { openBuildMenu(it.loc.coords, it.loc.id) }
        }

        for (locId in catalogue.furnitureLocIds()) {
            val type = ServerCacheManager.getObject(locId) ?: continue
            onOpLoc5(type) { removeFurniture(it.loc.coords, it.loc.id) }
        }

        for ((locId, destination) in PohPortals.teleports) {
            val type = ServerCacheManager.getObject(locId) ?: continue
            onOpLoc1(type) { enterPortal(destination) }
        }

        for (locId in doorIds) {
            val type = ServerCacheManager.getObject(locId) ?: continue
            onOpLoc5(type) { openRoomMenu(it.loc.coords) }
        }

        for (stairs in listOf("loc.poh_stairs_3", "loc.poh_stairs_4", "loc.poh_stairs_5")) {
            onOpLoc1(stairs) { climbStairs(it.loc.coords, 1) }
        }
        for (stairs in listOf("loc.poh_stairstop_3", "loc.poh_stairstop_4", "loc.poh_stairstop_5")) {
            onOpLoc1(stairs) { climbStairs(it.loc.coords, -1) }
        }
        for (stairs in listOf("loc.poh_spiralstairs", "loc.poh_spiralstairs_2")) {
            onOpLoc1(stairs) { climbStairs(it.loc.coords, 1) }
            onOpLoc2(stairs) { climbStairs(it.loc.coords, 1) }
            onOpLoc3(stairs) { climbStairs(it.loc.coords, -1) }
        }

        onCommand("house") {
            desc = "Enter your player-owned house"
            cheat { protectedAccess.launch(player) { enterHouse(buildMode = false) } }
        }
        onCommand("buildmode") {
            desc = "Enter your player-owned house in building mode"
            cheat { protectedAccess.launch(player) { enterHouse(buildMode = true) } }
        }
        onPlayerQueueWithArgs<BuildTask>(QUEUE_BUILD) { finishBuild(it.args) }
        onPlayerQueueWithArgs<RemoveTask>(QUEUE_REMOVE) { finishRemove(it.args) }

        onCommand("pohwhere") {
            desc = "Report how the tile under you resolves to a room slot and hotspot"
            cheat { dumpWhere() }
        }
        onCommand("pohrooms") {
            desc = "Dump what the cache says about house rooms and their hotspots"
            cheat { dumpRooms(args.getOrNull(0)) }
        }
    }

    /**
     * Every refusal in [openBuildMenu] is a silent return, so a hotspot that will not open gives
     * nothing to go on. This walks the same chain out loud.
     */
    private fun Cheat.dumpWhere() {
        val coords = player.coords
        val session = player.attr[SESSION]
        if (session == null) {
            player.mes("No house session: you are not inside your house.")
            return
        }
        player.mes("at $coords  region sw=${session.region.southWest} buildMode=${player.buildMode}")
        val slot = session.slotAt(coords)
        if (slot == null) {
            player.mes("slotAt: no grid slot for this tile.")
            return
        }
        val placed = session.layout.placed(slot)
        player.mes("slot=$slot placed=${placed?.room} rotation=${placed?.rotation}")
        val room = placed?.room?.let(catalogue::room)
        if (room == null) {
            player.mes("No room placed in this slot.")
            return
        }
        player.mes("room='${room.row.name}' hotspots=${room.hotspots.size}")
        val target = session.resolve(catalogue, houses, coords)
        if (target == null) {
            player.mes("resolve: this tile is not on any hotspot of that room.")
        } else {
            val spot = target.hotspot
            val visible = spot.builds.filter { it.hiddenInBuildMenu != 1 }
            player.mes(
                "resolve -> slot=${target.slot} hotspot=${spot.index + 1} " +
                    "builds=${spot.builds.size} visibleInMenu=${visible.size} " +
                    "alreadyBuilt=${session.layout.built(target.slot, spot.index)} " +
                    "saw=${player.inv.contains(OBJ_SAW)} hammer=${player.inv.contains(OBJ_HAMMER)}"
            )
        }
        for (spot in room.hotspots) {
            val where =
                spot.parts.joinToString {
                    houses.localCoords(session.region, slot, placed.rotation, it.localX, it.localZ)
                        .toString()
                }
            player.mes("  [${spot.index + 1}] $where")
        }
        val door = session.resolveDoor(catalogue, houses, coords)
        if (door == null) {
            player.mes("door: this tile is not a doorway of that room.")
        } else {
            val target = neighbour(door.slot, door.direction)
            player.mes(
                "door -> dir=${door.direction} neighbour=$target " +
                    "occupiedBy=${target?.let { session.layout.placed(it)?.room }}"
            )
        }
        for (entry in room.doors) {
            val at =
                houses.localCoords(session.region, slot, placed.rotation, entry.localX, entry.localZ)
            player.mes("  door dir=${entry.direction} ${entry.localX},${entry.localZ} -> $at")
        }
    }

    private fun Cheat.dumpRooms(filter: String?) {
        val rooms =
            catalogue.all().filter { filter == null || it.row.name.contains(filter, true) }
        player.mes("${rooms.size} room(s) loaded from dbtable.poh_room:")
        for (room in rooms.sortedBy { it.row.name }) {
            player.mes(
                "${room.row.name} lvl=${room.levelRequirement} cost=${room.cost} " +
                    "zone=${room.sourceZone.x},${room.sourceZone.z} " +
                    "doors=${room.doorsAfter(0)} hotspots=${room.hotspots.size}/${room.row.hotspot.size}"
            )
            for (hotspot in room.hotspots) {
                val part = hotspot.primary
                val loc = RSCM.getReverseMapping(RSCMType.LOC, part.locId)
                player.mes(
                    "  [${hotspot.index + 1}] ${part.localX},${part.localZ} $loc " +
                        "x${hotspot.parts.size} builds=${hotspot.builds.joinToString { it.name }}"
                )
            }
        }
    }

    private fun ProtectedAccess.enterHouse(buildMode: Boolean, portal: String? = null) {
        houseAccess.enter(this, buildMode, portal)
    }

    private fun ProtectedAccess.leaveHouse() { houseAccess.leave(this) }
    private fun ProtectedAccess.climbStairs(at: CoordGrid, change: Int) {
        val session = player.attr[SESSION] ?: return
        val slot = session.slotAt(at) ?: return
        if (slotLevel(slot) + change !in 0 until HOUSE_LEVELS) {
            mes("You cannot go any further ${if (change > 0) "up" else "down"}.")
            return
        }
        val target = slotKey(slotLevel(slot) + change, slotX(slot), slotZ(slot))
        if (session.layout.placed(target) == null) {
            mes("There is no room built ${if (change > 0) "above" else "below"} this staircase.")
            return
        }
        telejump(CoordGrid(coords.x, coords.z, slotLevel(target)))
    }

    private suspend fun ProtectedAccess.openBuildMenu(coords: CoordGrid, locId: Int? = null) {
        val session = player.attr[SESSION] ?: return
        if (!player.buildMode) {
            mes("You need to be in building mode to do that.")
            return
        }
        val target = session.resolve(catalogue, houses, coords, locId) ?: return
        if (session.layout.built(target.slot, target.hotspot.index) != null) {
            mes("You need to remove the existing furniture first.")
            return
        }
        if (!inv.contains(OBJ_SAW) || !inv.contains(OBJ_HAMMER)) {
            mes("You need a hammer and a saw to build furniture.")
            return
        }

        val builds = target.hotspot.builds.filter { it.hiddenInBuildMenu != 1 }
        if (builds.isEmpty()) {
            return
        }

        ifOpenMainModal(INTERFACE_FURNITURE)
        val interfaceId = RSCM.getRSCM(INTERFACE_FURNITURE)
        for (slot in 0 until FURNITURE_SLOTS) {
            val furniture = builds.getOrNull(slot)
            val child = slot + FURNITURE_FIRST_ENTRY_CHILD
            player.ifSetHide(interfaceId, child, furniture == null)
            player.ifSetPosition(
                interfaceId,
                child,
                (slot % FURNITURE_ENTRY_COLUMNS) * FURNITURE_ENTRY_WIDTH,
                (slot / FURNITURE_ENTRY_COLUMNS) * FURNITURE_ENTRY_HEIGHT,
            )
            if (furniture == null) {
                player.runClientScript(entryScript, slot + 1, 0, -1, "", 0)
                continue
            }
            player.runClientScript(
                entryScript,
                slot + 1,
                furniture.rowId,
                furniture.buildLevel(),
                furniture.materialText(),
                if (canBuild(furniture)) 1 else 0,
            )
        }

        // The entry script clears its component and rebuilds the children, which drops any event
        // set on them, so the Build click is enabled only once an entry has been filled. Its op runs
        // `[clientscript,poh_furniture_creation_op]`, which resumes from whichever child it built.
        for (slot in builds.indices) {
            ifSetEvents(
                furnitureEntryComponent(slot),
                0 until FURNITURE_ENTRY_CHILDREN,
                IfEvent.PauseButton,
            )
        }

        // Each entry is its own component, so the chosen slot is in the name rather than in a
        // subcomponent index.
        val input = pauseButton()
        val chosen = builds.indices.firstOrNull { input.isComponentType(furnitureEntryComponent(it)) }
        if (chosen == null) {
            logger.warn { "Build menu click on an unknown component: '${input.component}'." }
            return
        }
        startBuild(target, builds[chosen])
    }

    private suspend fun ProtectedAccess.startBuild(target: HotspotTarget, furniture: FurnitureRow) {
        val required = furniture.buildLevel()
        if (player.constructionLvl < required) {
            mes("You need a Construction level of $required to build that.")
            return
        }
        if (furniture.materials().any { (material, count) -> materialCount(material) < count }) {
            mes("You don't have the materials to build that.")
            return
        }
        stairRoomRefusal(target.slot, furniture)?.let {
            mes(it)
            return
        }
        val variant = portalDestination(furniture) ?: if (isPortal(furniture)) return else null
        anim(SEQ_BUILD)
        weakQueue(
            QUEUE_BUILD,
            BUILD_TICKS,
            BuildTask(target.slot, target.rotation, target.hotspot.index, furniture.rowId, variant),
        )
    }

    private fun ProtectedAccess.finishBuild(task: BuildTask) {
        resetAnim()
        val session = player.attr[SESSION] ?: return
        val placed = session.layout.placed(task.slot) ?: return
        val room = catalogue.room(placed.room) ?: return
        val hotspot = room.hotspot(task.hotspot) ?: return
        val furniture = hotspot.builds.firstOrNull { it.rowId == task.furniture } ?: return

        if (session.layout.built(task.slot, task.hotspot) != null) {
            return
        }
        stairRoomRefusal(task.slot, furniture)?.let {
            mes(it)
            return
        }
        for ((material, count) in furniture.materials()) {
            if (!takeMaterial(material, count)) {
                mes("You don't have the materials to build that.")
                return
            }
        }

        session.layout.build(task.slot, task.hotspot, furniture.rowId, task.variant)
        val stairs = catalogue.builtLocIds(furniture).firstNotNullOfOrNull { id ->
            STAIR_TOPS.entries.firstOrNull { it.key.asRSCM(RSCMType.LOC) == id }?.value
        }
        if (stairs != null) {
            session.layout.raiseFloor(task.slot, task.hotspot, furniture.rowId, stairs.asRSCM(RSCMType.LOC))
        }
        player.storeLayout(session.layout)
        spawnFurniture(session, task.slot, task.rotation, hotspot, furniture.rowId)
        statAdvance(STAT_CONSTRUCTION, furniture.xp() * xpMods.get(player, STAT_CONSTRUCTION))
        spam("You build a ${furniture.name}.")
    }

    private fun ProtectedAccess.stairRoomRefusal(slot: Int, furniture: FurnitureRow): String? {
        val stairs = catalogue.builtLocIds(furniture).any { id ->
            STAIR_TOPS.keys.any { it.asRSCM(RSCMType.LOC) == id }
        }
        if (!stairs || slotLevel(slot) + 1 >= HOUSE_LEVELS) return null
        val upper = slotKey(slotLevel(slot) + 1, slotX(slot), slotZ(slot))
        return player.attr[SESSION]?.layout?.additionRefusal(upper, player.baseConstructionLvl)
    }

    private data class BuildTask(
        val slot: Int,
        val rotation: Int,
        val hotspot: Int,
        val furniture: Int,
        val variant: Int?,
    )

    private suspend fun ProtectedAccess.removeFurniture(coords: CoordGrid, locId: Int? = null) {
        val session = player.attr[SESSION] ?: return
        if (!player.buildMode) {
            mes("You need to be in building mode to do that.")
            return
        }
        val target = session.resolve(catalogue, houses, coords, locId) ?: return
        val built = session.layout.built(target.slot, target.hotspot.index) ?: return
        if (menu("Really remove it?", hotkeys = false, choices = listOf("Yes", "No")) != 0) {
            return
        }
        anim(SEQ_BUILD)
        weakQueue(
            QUEUE_REMOVE,
            BUILD_TICKS,
            RemoveTask(target.slot, target.rotation, target.hotspot.index, built),
        )
    }

    private fun ProtectedAccess.finishRemove(task: RemoveTask) {
        resetAnim()
        val session = player.attr[SESSION] ?: return
        val placed = session.layout.placed(task.slot) ?: return
        val room = catalogue.room(placed.room) ?: return
        val hotspot = room.hotspot(task.hotspot) ?: return
        if (session.layout.built(task.slot, task.hotspot) != task.furniture) {
            return
        }
        session.layout.demolish(task.slot, task.hotspot)
        player.storeLayout(session.layout)
        despawnFurniture(session, HotspotTarget(task.slot, task.rotation, hotspot), task.furniture)
        spam("You remove the furniture.")
    }

    private data class RemoveTask(
        val slot: Int,
        val rotation: Int,
        val hotspot: Int,
        val furniture: Int,
    )

    private suspend fun ProtectedAccess.openRoomMenu(coords: CoordGrid) {
        val session = player.attr[SESSION] ?: return
        if (!player.buildMode) {
            mes("You need to be in building mode to do that.")
            return
        }
        val door = session.resolveDoor(catalogue, houses, coords)
        if (door == null) {
            mes("This doorway is not one the room knows about. Try the other side of it.")
            return
        }
        val destination = neighbour(door.slot, door.direction)
        if (destination == null) {
            mes("You can't build a room there.")
            return
        }
        if (destination in session.layout.rooms) {
            offerRoomRemoval(session, destination)
            return
        }
        session.layout.additionRefusal(destination, player.baseConstructionLvl)?.let {
            mes(it)
            return
        }

        val facing = (door.direction + 2) and 3
        val options =
            catalogue
                .all()
                .filter { it.levelRequirement <= player.constructionLvl }
                .filter { def -> (0..3).any { facing in def.doorsAfter(it) } }
                .sortedBy { it.cost }
        if (options.isEmpty()) {
            mes("You don't have the Construction level to build any rooms yet.")
            return
        }

        // ponytail: a chat menu stands in for interface.poh_add_room, whose room grid is driven by
        // client-side varcs the server does not set yet. Swap it out once that contract is known.
        val labels = options.map { "${it.name} (${it.cost} coins)" } + "Cancel"
        val room = options.getOrNull(menu("Build a room", hotkeys = false, choices = labels)) ?: return

        session.layout.additionRefusal(destination, player.baseConstructionLvl)?.let {
            mes(it)
            return
        }
        if (inv.count(OBJ_COINS) < room.cost) {
            mes("You need ${room.cost} coins to build a ${room.name}.")
            return
        }
        val rotation = (0..3).firstOrNull { facing in room.doorsAfter(it) } ?: return
        if (invDel(inv, OBJ_COINS, room.cost).failure) {
            return
        }

        session.layout.place(destination, room.id, rotation)
        player.storeLayout(session.layout)
        mes("You build a ${room.name}. Re-enter your house to walk into it.")
    }

    private suspend fun ProtectedAccess.offerRoomRemoval(session: HouseSession, slot: Int) {
        val room = session.layout.placed(slot)?.room?.let(catalogue::room) ?: return
        session.layout.removalRefusal(slot)?.let {
            mes(it)
            return
        }
        if (session.slotAt(player.coords) == slot) {
            mes("You can't remove a room while you are standing in it.")
            return
        }
        val title = "Remove the ${room.name}? Anything built in it is lost."
        if (menu(title, "Remove it", "Keep it") != 0) {
            return
        }
        session.layout.remove(slot)
        player.storeLayout(session.layout)
        mes("You remove the ${room.name}. Re-enter your house to see it gone.")
    }

    private fun spawnFurniture(session: HouseSession, slot: Int, rotation: Int, hotspot: HotspotDef, furnitureRow: Int) {
        houseAccess.spawnFurniture(session, slot, rotation, hotspot, furnitureRow)
    }

    private fun despawnFurniture(session: HouseSession, target: HotspotTarget, furnitureRow: Int) {
        houseAccess.despawnFurniture(session, target, furnitureRow)
    }
    private fun ProtectedAccess.canBuild(furniture: FurnitureRow): Boolean {
        if (player.constructionLvl < furniture.buildLevel()) {
            return false
        }
        return furniture.materials().all { (material, count) -> materialCount(material) >= count }
    }

    private fun isPortal(furniture: FurnitureRow): Boolean =
        catalogue.builtLocIds(furniture).any(PohPortals::isPortalFrame)

    /**
     * A portal is one furniture row per material whichever destination it leads to, so the
     * destination is picked when it is built and kept as the layout's variant loc. Returns null for
     * anything that is not a portal, and for a portal whose menu was cancelled.
     */
    private suspend fun ProtectedAccess.portalDestination(furniture: FurnitureRow): Int? {
        if (!isPortal(furniture)) {
            return null
        }
        val material =
            PohPortals.MATERIALS.firstOrNull { m ->
                catalogue.builtLocIds(furniture).any { locName(it).contains("_${m}_") }
            } ?: return null
        val labels = PohPortals.labels()
        val chosen = PohPortals.destinationAt(menu("Where should it lead?", hotkeys = false, choices = labels + "Cancel"))
        return chosen?.let { PohPortals.portalLoc(material, it) }
    }

    private fun locName(locId: Int): String = RSCM.getReverseMapping(RSCMType.LOC, locId)

    private fun ProtectedAccess.enterPortal(destination: CoordGrid) {
        telejump(destination)
        spam("You step through the portal.")
    }

    private fun ProtectedAccess.materialCount(material: String): Int =
        materialOptions(material).sumOf(inv::count)

    /** Spends [count] of [material], drawing across the nail tiers when the material is any_nails. */
    private fun ProtectedAccess.takeMaterial(material: String, count: Int): Boolean {
        var remaining = count
        for (option in materialOptions(material)) {
            if (remaining <= 0) {
                break
            }
            val held = inv.count(option)
            if (held <= 0) {
                continue
            }
            val take = minOf(held, remaining)
            if (invDel(inv, option, take).failure) {
                return false
            }
            remaining -= take
        }
        return remaining <= 0
    }

    private fun Player.layout(): HouseLayout = houseStore.state(this)

    private fun Player.storeLayout(layout: HouseLayout) {
        houseStore.save(this, layout)
    }

    private companion object {
        const val BUILD_TICKS = 3
        const val HOUSE_LOC_DURATION = Int.MAX_VALUE

        val SESSION = HouseAccess.SESSION
    }
}

private val STAIR_TOPS = mapOf(
    "loc.poh_stairs_3" to "loc.poh_stairstop_3",
    "loc.poh_stairs_4" to "loc.poh_stairstop_4",
    "loc.poh_stairs_5" to "loc.poh_stairstop_5",
    "loc.poh_spiralstairs" to "loc.poh_spiralstairs",
    "loc.poh_spiralstairs_2" to "loc.poh_spiralstairs_2",
)
