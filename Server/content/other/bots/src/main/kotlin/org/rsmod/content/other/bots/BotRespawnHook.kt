package org.rsmod.content.other.bots

import jakarta.inject.Inject
import org.rsmod.api.death.PlayerRespawnHook
import org.rsmod.game.entity.Player
import org.rsmod.map.CoordGrid

internal object BotRespawns {
    /** Edgeville, just south of the Wilderness ditch and beside the bank. */
    val EDGEVILLE: CoordGrid = CoordGrid(0, 48, 54, 21, 37)
}

/**
 * Wilderness PvP bots respawn in Edgeville instead of the global Lumbridge fallback.
 *
 * Non-PvP synthetic bots deliberately fall through to normal respawn handling so this hook does
 * not disrupt skilling, trade, drop-party, or other world-bot activities.
 */
internal class BotRespawnHook
@Inject
constructor(private val population: BotPopulation) : PlayerRespawnHook {
    override fun respawn(player: Player): CoordGrid? =
        BotRespawns.EDGEVILLE.takeIf { population.isPvpBot(player) }
}
