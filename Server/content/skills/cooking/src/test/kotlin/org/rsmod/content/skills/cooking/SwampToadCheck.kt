package org.rsmod.content.skills.cooking

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import org.rsmod.api.invtx.InvTransactions
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.protect.ProtectedAccessContextFactory
import org.rsmod.coroutine.GameCoroutine
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj

fun main() {
    ServerCacheManager.init(240)
    val toad = checkNotNull(ServerCacheManager.getItem("obj.swamp_toad".asRSCM(RSCMType.OBJ)))
    val legs = checkNotNull(ServerCacheManager.getItem("obj.toads_legs".asRSCM(RSCMType.OBJ)))
    val filler = checkNotNull(ServerCacheManager.getItem("obj.bucket_empty".asRSCM(RSCMType.OBJ)))
    check(toad.interfaceOptions[0].equals("Remove-legs", ignoreCase = true))
    val field = Class.forName("org.rsmod.api.invtx.InvTransactionsScriptKt")
        .getDeclaredField("cachedInventoryTransactions").apply { isAccessible = true }
    val previous = field.get(null)
    field.set(null, InvTransactions(emptyMap(), emptyMap(), emptyMap(), emptySet(), emptySet()))
    try {
        for (full in listOf(false, true)) {
            val player = Player()
            val inv = player.inv
            if (full) {
                for (slot in inv.indices) inv[slot] = InvObj(filler)
            }
            inv[3] = InvObj(toad)
            inv[17] = InvObj(toad)
            val before = inv.toList()
            val access = ProtectedAccess(
                player, GameCoroutine(), ProtectedAccessContextFactory.empty(),
            )
            with(SwampToadEvents()) { access.removeLegs(17) }
            check(inv[17]?.id == legs.id && inv[17]?.count == 1)
            for (slot in inv.indices) {
                if (slot != 17) check(inv[slot] == before[slot])
            }
            val after = inv.toList()
            with(SwampToadEvents()) { access.removeLegs(17) }
            check(inv.toList() == after)
            inv[17] = null
            val emptySlot = inv.toList()
            with(SwampToadEvents()) { access.removeLegs(17) }
            check(inv.toList() == emptySlot)
        }
        println("PASS: toad option, clicked slot, full inventory, other toads and stale clicks.")
    } finally {
        field.set(null, previous)
    }
}
