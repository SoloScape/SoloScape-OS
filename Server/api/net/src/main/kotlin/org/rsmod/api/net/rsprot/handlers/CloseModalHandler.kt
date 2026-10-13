package org.rsmod.api.net.rsprot.handlers

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import net.rsprot.protocol.game.incoming.misc.user.CloseModal
import org.rsmod.annotations.InternalApi
import org.rsmod.api.player.hook.PlayerRestrictions
import org.rsmod.api.player.hook.RestrictedAction
import org.rsmod.api.player.ui.ifOpenMainModal
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player

class CloseModalHandler
@Inject
constructor(
    private val restrictions: PlayerRestrictions,
    private val eventBus: EventBus,
) : MessageHandler<CloseModal> {
    @OptIn(InternalApi::class)
    override fun handle(player: Player, message: CloseModal) {
        if (restrictions.check(player, RestrictedAction.CloseModal) != null) {
            // The client can optimistically close modals on Escape. Re-send the
            // authoritative server-side main modal so it cannot be bypassed.
            player.ui.closeModal = false
            val main = player.ui.getModalOrNull("component.toplevel_osrs_stretch:mainmodal")
            if (main != null) {
                val interfaceId = player.ui.modals[main].id
                val key = RSCM.getReverseMapping(RSCMType.INTERFACE, interfaceId)
                player.ifOpenMainModal(key, eventBus)
            }
            return
        }
        player.ui.closeModal = true
    }
}
