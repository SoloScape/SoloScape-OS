package org.rsmod.api.net.rsprot.player

import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.definition.type.widget.IfEvent
import org.rsmod.game.ui.UserInterfaceMap

internal object InterfaceEvents {
    fun isEnabled(
        ui: UserInterfaceMap,
        component: ComponentType,
        comsub: Int,
        event: IfEvent,
    ): Boolean {
        val verifyStaticEvents = comsub == -1
        return if (verifyStaticEvents) {
            // An explicit IfSetEvents override for slot zero must be honoured
            // even if the packed widget has no static Op1 flag. This occurs on
            // server-opened legacy modals such as Tutorial Island's appearance
            // editor, where if3 may send a subcomponent index of -1.
            component.hasEvent(event) || ui.hasEvent(component, 0, event)
        } else {
            ui.hasEvent(component, comsub, event)
        }
    }
}
