package org.rsmod.content.other.bots

import dev.openrune.types.ItemServerType
import jakarta.inject.Inject
import org.rsmod.api.invtx.invAdd
import org.rsmod.api.player.hook.PlayerObjTakeRedirectHook
import org.rsmod.game.entity.Player
import org.rsmod.game.obj.Obj

internal class BotLootKeyGroundTakeHook
@Inject
constructor(private val store: BotLootKeyStore) : PlayerObjTakeRedirectHook {
    override fun redirects(player: Player, obj: Obj, objType: ItemServerType): Boolean {
        val bundleId = store.groundBundle(obj) ?: return false
        return player.invAdd(
            player.inv,
            obj.type,
            obj.count,
            vars = bundleId,
            autoCommit = false,
        ).success
    }

    override fun take(player: Player, obj: Obj, objType: ItemServerType): Boolean {
        val bundleId = store.groundBundle(obj) ?: return false
        val result = player.invAdd(player.inv, obj.type, obj.count, vars = bundleId)
        if (result.success) {
            store.unbindGround(obj, bundleId)
        }
        return result.success
    }
}
