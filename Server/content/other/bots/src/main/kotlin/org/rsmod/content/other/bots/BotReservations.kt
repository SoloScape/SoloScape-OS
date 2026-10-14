package org.rsmod.content.other.bots

import java.util.WeakHashMap

internal class BotReservations<Owner : Any, Target : Any> {
    private val targets = WeakHashMap<Owner, Target>()

    fun available(owner: Owner, target: Target): Boolean =
        targets.none { (other, held) -> other !== owner && held == target }

    fun claim(owner: Owner, target: Target): Boolean {
        if (!available(owner, target)) return false
        targets[owner] = target
        return true
    }

    fun release(owner: Owner) {
        targets.remove(owner)
    }
}
