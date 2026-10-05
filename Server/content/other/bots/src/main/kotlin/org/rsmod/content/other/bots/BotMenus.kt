package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.definition.type.widget.IfEvent
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.aconverted.interf.IfButtonOp
import jakarta.inject.Inject
import org.rsmod.api.player.input.DialogInput
import org.rsmod.api.player.input.ResumePCountDialogInput
import org.rsmod.api.player.input.ResumePauseButtonInput
import org.rsmod.api.player.protect.ProtectedAccessLauncher
import org.rsmod.api.player.ui.IfModalButton
import org.rsmod.api.player.ui.ifClose
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player
import org.rsmod.game.type.getInvObj
import org.rsmod.game.ui.UserInterface

class BotMenus
@Inject
constructor(
    private val eventBus: EventBus,
    private val protectedAccess: ProtectedAccessLauncher,
) {
    fun tick(player: Player, recipe: String? = null): Boolean {
        if (player.isDelayed) return true
        val coroutine = player.activeCoroutine
        if (coroutine?.isAwaiting(ResumePCountDialogInput::class) == true) {
            eventBus.publish(DialogInput(player, 28))
            player.resumeActiveCoroutine(ResumePCountDialogInput(28))
            return true
        }
        if (coroutine?.isAwaiting(ResumePauseButtonInput::class) == true) {
            val options = listOf(
                Triple("interface.skillmulti",
                    if (recipe.equals("Steel bar", true)) "component.skillmulti:b" else "component.skillmulti:a", 28),
                Triple("interface.chat_left", "component.chat_left:continue", -1),
                Triple("interface.chat_right", "component.chat_right:continue", -1),
                Triple("interface.chatmenu", "component.chatmenu:options", 1),
                Triple("interface.messagebox", "component.messagebox:continue", -1),
                Triple("interface.objectbox", "component.objectbox:universe", -1),
            )
            for ((interf, component, sub) in options) {
                if (!player.ui.containsModal(interf)) continue
                val type = ServerCacheManager.fromComponent(component)
                val enabled = if (sub == -1) type.hasEvent(IfEvent.PauseButton)
                    else player.ui.hasEvent(type, sub, IfEvent.PauseButton)
                if (!enabled) continue
                val modal = player.ui.modals.getComponent(
                    UserInterface(interf.asRSCM(RSCMType.INTERFACE))
                ) ?: continue
                player.ui.queueClose(modal)
                player.resumeActiveCoroutine(ResumePauseButtonInput(component, sub))
                return true
            }
            return true
        }
        if (player.isAccessProtected) return true
        if (player.ui.containsModal("interface.smithing")) {
            return protectedAccess.launch(player) {
                eventBus.publish(this, button("component.smithing:make_all"))
                eventBus.publish(this, button("component.smithing:dagger"))
            }
        }
        if (player.ui.containsModal("interface.tanner")) {
            return protectedAccess.launch(player) {
                eventBus.publish(this, button("component.tanner:tanning_a_all"))
            }
        }
        val shop = player.openedShop
        if (shop != null && player.ui.containsModal("interface.shopmain")) {
            val sale = player.inv.indices.firstOrNull {
                val obj = player.inv[it]
                obj != null && !getInvObj(obj).name.equals("Coins", true) &&
                    (recipe == null || !getInvObj(obj).name.equals(recipe, true))
            }
            if (sale != null) {
                val type = getInvObj(player.inv[sale]!!)
                return protectedAccess.launch(player) {
                    eventBus.publish(this, button("component.shopside:items", sale, type, IfButtonOp.Op5))
                }
            }
            val purchase = shop.inv.indices.firstOrNull {
                val obj = shop.inv[it]
                obj != null && obj.count > 0 &&
                    (recipe == null || getInvObj(obj).name.equals(recipe, true))
            }
            if (purchase != null && player.inv.indices.any { player.inv[it] == null }) {
                val type = getInvObj(shop.inv[purchase]!!)
                return protectedAccess.launch(player) {
                    eventBus.publish(this, button("component.shopmain:items", purchase + 1, type, IfButtonOp.Op2))
                }
            }
            player.ifClose(eventBus)
            return true
        }
        return false
    }

    private fun button(
        component: String,
        sub: Int = -1,
        obj: ItemServerType? = null,
        op: IfButtonOp = IfButtonOp.Op1,
    ): IfModalButton = IfModalButton(ServerCacheManager.fromComponent(component), sub, obj, op)
}
