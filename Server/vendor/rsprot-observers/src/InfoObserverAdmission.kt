package net.rsprot.protocol.game.outgoing.info

import java.util.IdentityHashMap

/** Mutated on the communication thread, before synchronous protocol workers are submitted. */
public object InfoObserverAdmission {
    private val disabled = IdentityHashMap<Any, Boolean>()

    public fun disable(infos: Infos) {
        disabled[infos.playerInfo] = true
        disabled[infos.npcInfo] = true
        disabled[infos.worldEntityInfo] = true
    }

    public fun enable(infos: Infos) {
        disabled.remove(infos.playerInfo)
        disabled.remove(infos.npcInfo)
        disabled.remove(infos.worldEntityInfo)
    }

    public fun isEnabled(info: Any): Boolean = !disabled.containsKey(info)
}
