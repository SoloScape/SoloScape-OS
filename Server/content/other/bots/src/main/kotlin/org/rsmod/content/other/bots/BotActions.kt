package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.WeakHashMap
import org.rsmod.api.invtx.invTransaction
import org.rsmod.api.invtx.invTransfer
import org.rsmod.api.invtx.select
import org.rsmod.api.invtx.transfer
import org.rsmod.api.player.interact.HeldInteractions
import org.rsmod.api.player.interact.HeldUInteractions
import org.rsmod.api.player.interact.LocInteractions
import org.rsmod.api.player.interact.LocTInteractions
import org.rsmod.api.player.interact.NpcInteractions
import org.rsmod.api.player.interact.ObjInteractions
import org.rsmod.api.player.protect.ProtectedAccessLauncher
import org.rsmod.api.player.stat.hitpoints
import org.rsmod.api.player.protect.clearPendingAction
import org.rsmod.api.registry.loc.LocRegistry
import org.rsmod.api.registry.npc.NpcRegistry
import org.rsmod.api.registry.obj.ObjRegistry
import org.rsmod.api.registry.player.PlayerRegistry
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player
import org.rsmod.game.interact.HeldOp
import org.rsmod.game.interact.InteractionLocOp
import org.rsmod.game.interact.InteractionLocT
import org.rsmod.game.interact.InteractionNpcOp
import org.rsmod.game.interact.InteractionObj
import org.rsmod.game.interact.InteractionOp
import org.rsmod.game.inv.InvObj
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.movement.RouteRequestCoord
import org.rsmod.game.movement.RouteRequestLoc
import org.rsmod.game.movement.RouteRequestPathingEntity
import org.rsmod.game.type.getInvObj
import org.rsmod.map.CoordGrid
import org.rsmod.map.zone.ZoneKey
import org.rsmod.routefinder.Route
import org.rsmod.routefinder.RouteFinding
import org.rsmod.routefinder.collision.CollisionFlagMap

@Singleton
class BotActions
@Inject
constructor(
    private val eventBus: EventBus,
    private val locRegistry: LocRegistry,
    private val npcRegistry: NpcRegistry,
    private val objRegistry: ObjRegistry,
    private val locInteractions: LocInteractions,
    private val locTInteractions: LocTInteractions,
    private val npcInteractions: NpcInteractions,
    private val objInteractions: ObjInteractions,
    private val heldInteractions: HeldInteractions,
    private val heldUInteractions: HeldUInteractions,
    private val protectedAccess: ProtectedAccessLauncher,
    private val players: PlayerRegistry,
    collision: CollisionFlagMap,
) {
    private val routeFinding = RouteFinding(collision)
    private val gatheringTargets = BotReservations<Player, Any>()
    private val occupancy = BotOccupancy<Player, CoordGrid>()
    private val work = BotTickWork()
    private val walkChecks = HashMap<Pair<CoordGrid, CoordGrid>, Boolean>()
    private val resourceCursors = WeakHashMap<Player, Any>()
    private var occupancyReady = false
    private var selectionSearches = 0
    private var priorityDecision = false
    private val selectionTraces = WeakHashMap<Player, String>()
    private val avoidedThreats = WeakHashMap<Player, Pair<Int, List<CoordGrid>>>()
    var selectionDeferred = false
        private set
    val decisionAvailable: Boolean get() = priorityDecision || work.available
    val normalDecision: Boolean get() = !priorityDecision

    fun beginTick() {
        walkChecks.clear()
        occupancyReady = false
        work.beginTick()
    }

    fun endTick() {
        walkChecks.clear()
        work.endTick()
        priorityDecision = false
    }

    fun beginDecision(priority: Boolean = false) {
        priorityDecision = priority
        walkChecks.clear()
        selectionDeferred = false
    }

    fun forget(player: Player) {
        release(player)
        occupancy.remove(player)
        resourceCursors.remove(player)
    }

    private fun occupied(player: Player?): Set<CoordGrid> {
        if (!occupancyReady) {
            occupancy.snapshot(players.playerList.asSequence().map { it to it.coords })
            occupancyReady = true
        }
        return occupancy.excluding(player)
    }

    private class SelectionDeferred : RuntimeException(null, null, false, false)

    private fun resourceSearch(search: () -> Route): Route {
        if (priorityDecision) return measureRoute(search)
        if (!work.available || selectionSearches >= 32) throw SelectionDeferred()
        selectionSearches++
        return work.search { measureRoute(search) }
    }

    private fun <T> measureRoute(search: () -> T): T {
        if (!BotMetrics.measuring) return search()
        val start = System.nanoTime()
        try {
            return search()
        } finally {
            BotMetrics.route(System.nanoTime() - start)
        }
    }

    private fun <T> candidates(player: Player, targets: Sequence<T>, key: (T) -> Any): List<T> =
        BotCandidateOrder.resume(targets.toList(), resourceCursors[player], key)

    fun avoidThreats(player: Player, threats: List<CoordGrid>) {
        avoidedThreats[player] = (player.currentMapClock + BotFleePlanner.RETREAT_COOLDOWN) to
            threats.toList()
    }

    private fun safeResource(player: Player, coords: CoordGrid): Boolean {
        val avoidance = avoidedThreats[player] ?: return true
        if (player.currentMapClock >= avoidance.first) {
            avoidedThreats.remove(player)
            return true
        }
        return BotFleePlanner.safeResource(coords, avoidance.second)
    }

    var debugEnabled = false
        set(value) { field = value; if (!value) selectionTraces.clear() }

    fun selectionTrace(player: Player): String? = selectionTraces[player]

    private fun trace(player: Player, message: String) {
        if (debugEnabled) selectionTraces[player] = message
    }

    fun release(player: Player) {
        gatheringTargets.release(player)
        occupancy.release(player)
    }

    fun spawnPoint(origin: CoordGrid): CoordGrid? {
        walkChecks.clear()
        occupancyReady = false
        return freePoint(origin, origin, null, 6).also { occupancyReady = false }
    }

    private fun freePoint(
        source: CoordGrid,
        origin: CoordGrid,
        player: Player?,
        radius: Int,
    ): CoordGrid? {
        val occupied = occupied(player)
        val candidates = (-radius..radius).flatMap { x ->
            (-radius..radius).map { z -> CoordGrid(origin.x + x, origin.z + z, origin.level) }
        }.shuffled().sortedBy { origin.chebyshevDistance(it) }
        return candidates.firstOrNull { candidate ->
            candidate !in occupied && canWalk(source, candidate)
        }
    }

    fun canWalk(source: CoordGrid, destination: CoordGrid): Boolean {
        if (source.level != destination.level) return false
        return walkChecks.getOrPut(source to destination) {
            val search = {
                routeFinding.findRoute(
                    level = source.level, srcX = source.x, srcZ = source.z,
                    destX = destination.x, destZ = destination.z, moveNear = false,
                ).success
            }
            if (priorityDecision) measureRoute(search) else work.search { measureRoute(search) }
        }
    }

    fun walk(player: Player, destination: CoordGrid, spread: Boolean = false): Boolean {
        if (busy(player) || player.coords.level != destination.level) return false
        val target = if (spread) freePoint(player.coords, destination, player, 2) ?: run {
            trace(player, "No free reachable tile near route waypoint $destination")
            return false
        }
            else destination
        if (!canWalk(player.coords, target)) {
            trace(player, "No reachable route to $destination")
            return false
        }
        trace(player, "Walking to ${target.x},${target.z},${target.level}")
        release(player)
        if (spread) occupancy.reserve(player, target)
        player.clearPendingAction(eventBus)
        player.resetFaceEntity()
        player.routeRequest = RouteRequestCoord(target, clientRequest = true)
        return true
    }

    fun operate(
        player: Player,
        names: Set<String>,
        option: String,
        radius: Int = 12,
        exclusive: Boolean = false,
        sharedNpc: Boolean = false,
        sharedLoc: (ObjectServerType) -> Boolean = { false },
        eligibleLoc: (ObjectServerType) -> Boolean = { true },
    ): Boolean {
        selectionDeferred = false
        selectionSearches = 0
        BotMetrics.scan()
        return try {
            operateResource(player, names, option, radius, exclusive, sharedNpc, sharedLoc, eligibleLoc)
        } catch (_: SelectionDeferred) {
            selectionDeferred = true
            trace(player, "Resource search deferred by tick routing budget")
            false
        }
    }

    private fun operateResource(
        player: Player,
        names: Set<String>,
        option: String,
        radius: Int = 12,
        exclusive: Boolean = false,
        sharedNpc: Boolean = false,
        sharedLoc: (ObjectServerType) -> Boolean = { false },
        eligibleLoc: (ObjectServerType) -> Boolean = { true },
    ): Boolean {
        if (busy(player)) return false
        var matched = 0
        var ineligible = 0
        var reserved = 0
        var noOption = 0
        var noApproach = 0
        fun report(result: String) = trace(player,
            "$result; targets=${names.joinToString()}; option=$option; radius=$radius; " +
                "matched=$matched; ineligible=$ineligible; reserved=$reserved; " +
                "noOption=$noOption; noFreeReachableApproach=$noApproach")
        release(player)
        val npcs = zones(player.coords, radius).flatMap(npcRegistry::findAll)
            .filter { near(player.coords, it.coords, radius) && !it.hidden }
            .filter { named(it.name, names) && safeResource(player, it.coords) }
            .sortedBy { player.coords.chebyshevDistance(it.coords) }
        for (npc in if (exclusive) candidates(player, npcs) { it } else npcs.toList()) {
            if (exclusive) resourceCursors[player] = npc
            matched++
            val reserveResource = exclusive && !sharedNpc
            if (reserveResource && !gatheringTargets.available(player, npc)) { reserved++; continue }
            val op = InteractionOp.entries.firstOrNull {
                matchesOption(npc.type.actions.getOpOrNull(it.slot - 1), option)
            } ?: run { noOption++; null } ?: continue
            val destination = if (exclusive) {
                npcGatheringDestination(routeFinding, player.coords, npc.coords, npc.size,
                    occupied(player), shared = sharedNpc, search = ::resourceSearch)
                    ?: run { noApproach++; null } ?: continue
            } else null
            if (reserveResource && !gatheringTargets.claim(player, npc)) continue
            if (destination != null) occupancy.reserve(player, destination)
            player.clearPendingAction(eventBus)
            player.faceNpc(npc)
            player.interaction = InteractionNpcOp(
                target = npc,
                op = op,
                hasOpTrigger = npcInteractions.hasOpTrigger(player, npc, op),
                hasApTrigger = npcInteractions.hasApTrigger(player, npc, op),
            )
            player.routeRequest = if (destination != null) {
                RouteRequestCoord(destination, clientRequest = true)
            } else RouteRequestPathingEntity(npc.avatar, clientRequest = true)
            report("Selected NPC ${npc.name} at ${npc.coords}; standing=$destination")
            resourceCursors.remove(player)
            return true
        }
        val locs = locations(player, names, radius)
        for (loc in if (exclusive) candidates(player, locs) { it.coords to it.id } else locs.toList()) {
            matched++
            val key = loc.coords to loc.id
            if (exclusive) resourceCursors[player] = key
            val baseType = ServerCacheManager.getObject(loc.id) ?: continue
            val type = visibleType(player, loc, baseType)
            if (!eligibleLoc(type)) { ineligible++; continue }
            val reserveResource = exclusive && !sharedLoc(type)
            if (reserveResource && !gatheringTargets.available(player, key)) { reserved++; continue }
            val op = InteractionOp.entries.firstOrNull {
                type.actions.getOpOrNull(it.slot - 1).equals(option, ignoreCase = true)
            } ?: run { noOption++; null } ?: continue
            val destination = if (exclusive) {
                gatheringDestination(routeFinding, player.coords, loc, type,
                    occupied(player), search = ::resourceSearch)
                    ?: run { noApproach++; null } ?: continue
            } else null
            if (reserveResource && !gatheringTargets.claim(player, key)) continue
            if (destination != null) occupancy.reserve(player, destination)
            val bound = BoundLocInfo(loc, baseType)
            player.clearPendingAction(eventBus)
            player.resetFaceEntity()
            player.faceLoc(loc, type.width, type.length)
            player.interaction = InteractionLocOp(
                target = bound,
                op = op,
                hasOpTrigger = locInteractions.hasOpTrigger(player, bound, op, baseType),
                hasApTrigger = locInteractions.hasApTrigger(player, bound, op, baseType),
            )
            if (destination != null) {
                player.routeRequest = RouteRequestCoord(destination, clientRequest = true)
            } else routeLoc(player, loc, type)
            report("Selected ${type.name} at ${loc.coords}; standing=$destination")
            resourceCursors.remove(player)
            return true
        }
        resourceCursors.remove(player)
        report("No usable resource")
        return false
    }

    fun useItemOnLoc(
        player: Player,
        item: String,
        names: Set<String>,
        radius: Int = 12,
    ): Boolean {
        if (busy(player)) return false
        val slot = player.inv.indices.firstOrNull { matches(player.inv[it], item) } ?: return false
        val objType = getInvObj(player.inv[slot] ?: return false)
        val loc = locations(player, names, radius).firstOrNull() ?: return false
        val type = ServerCacheManager.getObject(loc.id) ?: return false
        val bound = BoundLocInfo(loc, type)
        val component = ServerCacheManager.fromComponent(
            "component.inventory:items".asRSCM(RSCMType.COMPONENT)
        )
        player.clearPendingAction(eventBus)
        player.resetFaceEntity()
        player.faceLoc(loc, type.width, type.length)
        player.interaction = InteractionLocT(
            target = bound,
            comsub = slot,
            objType = objType,
            component = component,
            hasOpTrigger = locTInteractions.hasOpTrigger(player, bound, type, objType, component, slot),
            hasApTrigger = locTInteractions.hasApTrigger(player, bound, type, objType, component, slot),
        )
        routeLoc(player, loc, type)
        return true
    }

    fun useItems(player: Player, first: String, second: String): Boolean {
        if (busy(player)) return false
        val firstSlot = player.inv.indices.firstOrNull { matches(player.inv[it], first) }
            ?: return false
        val secondSlot = player.inv.indices.firstOrNull {
            it != firstSlot && matches(player.inv[it], second)
        } ?: return false
        val firstType = getInvObj(player.inv[firstSlot] ?: return false)
        val secondType = getInvObj(player.inv[secondSlot] ?: return false)
        return protectedAccess.launch(player) {
            heldUInteractions.interact(this, player.inv, firstType, firstSlot, secondType, secondSlot)
        }
    }

    fun held(player: Player, slot: Int, op: Int = 1): Boolean {
        if (busy(player) || slot !in player.inv.indices || player.inv[slot] == null) return false
        val operation = HeldOp[op] ?: return false
        return protectedAccess.launch(player) {
            heldInteractions.interact(this, player.inv, slot, operation)
        }
    }

    fun pickup(
        player: Player,
        radius: Int = 8,
        ignored: Set<String> = emptySet(),
    ): Boolean {
        if (busy(player)) return false
        val obj = zones(player.coords, radius).flatMap(objRegistry::findAll)
            .filter { near(player.coords, it.coords, radius) && it.isVisibleTo(player) }
            .filter {
                val type = ServerCacheManager.getItem(it.type)
                type != null && !named(type.name, ignored)
            }
            .minByOrNull { player.coords.chebyshevDistance(it.coords) } ?: return false
        val op = InteractionOp.Op3
        player.clearPendingAction(eventBus)
        player.resetFaceEntity()
        player.interaction = InteractionObj(
            target = obj,
            op = op,
            hasOpTrigger = objInteractions.hasOpTrigger(obj, op),
            hasApTrigger = objInteractions.hasApTrigger(obj, op),
        )
        player.routeRequest = RouteRequestCoord(obj.coords, clientRequest = true)
        return true
    }

    fun bank(player: Player, keep: Set<String>): Boolean {
        if (busy(player) || !atBank(player)) return false
        val slots = player.inv.indices.filter { slot ->
            val obj = player.inv[slot]
            obj != null && keep.none { matches(obj, it) }
        }
        if (slots.isEmpty()) return true
        return protectedAccess.launch(player) {
            val transaction = player.invTransaction(inv, bank, autoCommit = false) {
                val from = select(inv)
                val into = select(bank)
                for (slot in slots) {
                    val count = inv[slot]?.count ?: continue
                    transfer(from, slot, count, into, uncert = true)
                }
            }
            if (transaction.success) {
                transaction.commitAll()
            }
        }
    }

    fun withdraw(player: Player, item: String, count: Int): Boolean {
        if (busy(player) || count <= 0 || !atBank(player)) return false
        return protectedAccess.launch(player) {
            val slot = bank.indices.firstOrNull { matches(bank[it], item) } ?: return@launch
            val transaction = player.invTransfer(
                bank, slot, count, inv, strict = true, autoCommit = false
            )
            if (transaction.success) {
                transaction.commitAll()
            }
        }
    }

    private fun atBank(player: Player): Boolean {
        val npc = zones(player.coords, BANK_RADIUS).flatMap(npcRegistry::findAll).any {
            !it.hidden && near(player.coords, it.coords, BANK_RADIUS) &&
                named(it.name, BANK_NPCS) &&
                InteractionOp.entries.any { op ->
                    it.type.actions.getOpOrNull(op.slot - 1).equals("Bank", true)
                }
        }
        val loc = locations(player, BANK_LOCS, BANK_RADIUS).any {
            val type = ServerCacheManager.getObject(it.id)
            type != null && InteractionOp.entries.any { op ->
                val option = type.actions.getOpOrNull(op.slot - 1)
                option.equals("Bank", true) || option.equals("Use", true)
            }
        }
        if (npc || loc) return true
        operate(player, BANK_NPCS + BANK_LOCS, "Bank") ||
            operate(player, BANK_LOCS, "Use")
        return false
    }

    private fun locations(player: Player, names: Set<String>, radius: Int): Sequence<LocInfo> =
        zones(player.coords, radius).flatMap(locRegistry::findAll)
            .filter { near(player.coords, it.coords, radius) && safeResource(player, it.coords) }
            .filter { loc -> names.any { it.startsWith("loc.") && it.asRSCM() == loc.id } ||
                ServerCacheManager.getObject(loc.id)?.let {
                    named(visibleType(player, loc, it).name, names)
                } == true }
            .sortedBy { player.coords.chebyshevDistance(it.coords) }

    private fun visibleType(player: Player, loc: LocInfo, type: ObjectServerType): ObjectServerType =
        locInteractions.multiLoc(BoundLocInfo(loc, type), type, player.vars)
            ?.let { ServerCacheManager.getObject(it.id) } ?: type

    private fun routeLoc(player: Player, loc: LocInfo, type: ObjectServerType) {
        player.routeRequest = RouteRequestLoc(
            destination = loc.coords,
            width = type.width,
            length = type.length,
            shape = loc.entity.shape,
            angle = loc.entity.angle,
            forceApproachFlags = type.forceApproachFlags,
            clientRequest = true,
        )
    }

    private fun matches(obj: InvObj?, item: String): Boolean {
        if (obj == null) return false
        val type = getInvObj(obj)
        return if (item.equals("Coins", true)) {
            type.id == "obj.coins".asRSCM(RSCMType.OBJ)
        } else if (item.startsWith("obj.")) {
            RSCM.getReverseMapping(RSCMType.OBJ, type.id) == item
        } else named(type.name, setOf(item))
    }

    private fun busy(player: Player): Boolean =
        player.isDelayed || player.isAccessProtected || player.hitpoints <= 0

    companion object {
        private const val RECTANGLE_EXCLUSIVE_STRATEGY = -2
        private const val BANK_RADIUS = 2
        private val BANK_NPCS = setOf("Banker", "Banker tutor")
        private val BANK_LOCS = setOf("Bank booth", "Bank chest")

        internal fun matchesOption(actual: String?, requested: String): Boolean =
            actual.equals(requested, true) ||
                (requested.equals("net", true) && actual.equals("Small Net", true))

        internal fun npcGatheringDestination(
            routes: RouteFinding,
            source: CoordGrid,
            target: CoordGrid,
            size: Int,
            occupied: Set<CoordGrid>,
            shared: Boolean = false,
            search: (() -> Route) -> Route = { it() },
        ): CoordGrid? {
            fun approach(from: CoordGrid) = search { routes.findRoute(
                level = from.level, srcX = from.x, srcZ = from.z,
                destX = target.x, destZ = target.z, destWidth = size, destLength = size,
                locShape = RECTANGLE_EXCLUSIVE_STRATEGY, moveNear = false,
            ) }
            val route = approach(source)
            if (route.success) {
                val preferred = route.lastOrNull()?.let { CoordGrid(it.x, it.z, source.level) }
                    ?: source
                if (shared || preferred !in occupied) return preferred
            }
            return (-1..size).flatMap { x ->
                (-1..size).filter { z -> x == -1 || x == size || z == -1 || z == size }
                    .map { z -> target.translate(x, z) }
            }.filter { shared || it !in occupied }.sortedBy { source.chebyshevDistance(it) }
                .firstOrNull { candidate ->
                    val adjacent = approach(candidate)
                    adjacent.success && adjacent.isEmpty() && search { routes.findRoute(
                        level = source.level, srcX = source.x, srcZ = source.z,
                        destX = candidate.x, destZ = candidate.z, moveNear = false,
                    ) }.success
                }
        }

        internal fun gatheringDestination(
            routes: RouteFinding,
            source: CoordGrid,
            loc: LocInfo,
            type: ObjectServerType,
            occupied: Set<CoordGrid>,
            search: (() -> Route) -> Route = { it() },
        ): CoordGrid? {
            fun approach(from: CoordGrid) = search { routes.findRoute(
                level = from.level, srcX = from.x, srcZ = from.z,
                destX = loc.coords.x, destZ = loc.coords.z,
                destWidth = type.width, destLength = type.length,
                locShape = loc.entity.shape, locAngle = loc.entity.angle,
                blockAccessFlags = type.forceApproachFlags, moveNear = false,
            ) }
            val route = approach(source)
            if (route.success) {
                val preferred = route.lastOrNull()?.let { CoordGrid(it.x, it.z, source.level) } ?: source
                if (preferred !in occupied) return preferred
            }
            val rotated = loc.entity.angle % 2 != 0
            val width = if (rotated) type.length else type.width
            val length = if (rotated) type.width else type.length
            val candidates = (-1..width).flatMap { x ->
                (-1..length).filter { z -> x == -1 || x == width || z == -1 || z == length }
                    .map { z -> loc.coords.translate(x, z) }
            }.filter { it !in occupied }.sortedBy { source.chebyshevDistance(it) }
            return candidates.firstOrNull { candidate ->
                // The native loc strategy must accept this tile without another step.
                val adjacent = approach(candidate)
                adjacent.success && adjacent.isEmpty() && search { routes.findRoute(
                    level = source.level, srcX = source.x, srcZ = source.z,
                    destX = candidate.x, destZ = candidate.z, moveNear = false,
                ) }.success
            }
        }

        internal fun near(origin: CoordGrid, target: CoordGrid, radius: Int): Boolean =
            radius >= 0 && origin.level == target.level &&
                origin.chebyshevDistance(target) <= radius

        internal fun named(name: String, names: Set<String>): Boolean =
            names.any { name.trim().equals(it.trim(), ignoreCase = true) }

        internal fun zones(coords: CoordGrid, radius: Int): Sequence<ZoneKey> = sequence {
            val distance = radius.coerceIn(0, 32)
            for (x in ((coords.x - distance).coerceAtLeast(0) / 8)..((coords.x + distance) / 8).coerceAtMost(ZoneKey.X_BIT_MASK)) {
                for (z in ((coords.z - distance).coerceAtLeast(0) / 8)..((coords.z + distance) / 8).coerceAtMost(ZoneKey.Z_BIT_MASK)) {
                    yield(ZoneKey(x, z, coords.level))
                }
            }
        }
    }
}
