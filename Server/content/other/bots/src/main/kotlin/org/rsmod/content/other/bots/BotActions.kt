package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import jakarta.inject.Inject
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
) {
    fun walk(player: Player, destination: CoordGrid) {
        if (busy(player) || player.coords.level != destination.level) return
        player.clearPendingAction(eventBus)
        player.resetFaceEntity()
        player.routeRequest = RouteRequestCoord(destination, clientRequest = true)
    }

    fun operate(
        player: Player,
        names: Set<String>,
        option: String,
        radius: Int = 12,
    ): Boolean {
        if (busy(player)) return false
        val npcs = zones(player.coords, radius).flatMap(npcRegistry::findAll)
            .filter { near(player.coords, it.coords, radius) && !it.hidden }
            .filter { named(it.name, names) }
            .sortedBy { player.coords.chebyshevDistance(it.coords) }
        for (npc in npcs) {
            val op = InteractionOp.entries.firstOrNull {
                npc.type.actions.getOpOrNull(it.slot - 1).equals(option, ignoreCase = true)
            } ?: continue
            player.clearPendingAction(eventBus)
            player.faceNpc(npc)
            player.interaction = InteractionNpcOp(
                target = npc,
                op = op,
                hasOpTrigger = npcInteractions.hasOpTrigger(player, npc, op),
                hasApTrigger = npcInteractions.hasApTrigger(player, npc, op),
            )
            player.routeRequest = RouteRequestPathingEntity(npc.avatar, clientRequest = true)
            return true
        }
        for (loc in locations(player, names, radius)) {
            val type = ServerCacheManager.getObject(loc.id) ?: continue
            val op = InteractionOp.entries.firstOrNull {
                type.actions.getOpOrNull(it.slot - 1).equals(option, ignoreCase = true)
            } ?: continue
            val bound = BoundLocInfo(loc, type)
            player.clearPendingAction(eventBus)
            player.resetFaceEntity()
            player.faceLoc(loc, type.width, type.length)
            player.interaction = InteractionLocOp(
                target = bound,
                op = op,
                hasOpTrigger = locInteractions.hasOpTrigger(player, bound, op, type),
                hasApTrigger = locInteractions.hasApTrigger(player, bound, op, type),
            )
            routeLoc(player, loc, type)
            return true
        }
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
            .filter { near(player.coords, it.coords, radius) }
            .filter { named(ServerCacheManager.getObject(it.id)?.name.orEmpty(), names) }
            .sortedBy { player.coords.chebyshevDistance(it.coords) }

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
        return if (item.startsWith("obj.")) {
            RSCM.getReverseMapping(RSCMType.OBJ, type.id) == item
        } else named(type.name, setOf(item))
    }

    private fun busy(player: Player): Boolean =
        player.isDelayed || player.isAccessProtected || player.hitpoints <= 0

    companion object {
        private const val BANK_RADIUS = 2
        private val BANK_NPCS = setOf("Banker", "Banker tutor")
        private val BANK_LOCS = setOf("Bank booth", "Bank chest")

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
