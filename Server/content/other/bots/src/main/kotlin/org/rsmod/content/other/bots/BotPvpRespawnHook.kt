package org.rsmod.content.other.bots

import jakarta.inject.Inject
import org.rsmod.api.death.PlayerRespawnHook
import org.rsmod.game.entity.Player
import org.rsmod.map.CoordGrid

/**
 * Synthetic PvP bots respawn in Edgeville so their death/restock loop stays near the Wilderness
 * instead of sending them through the default Lumbridge respawn path.
 */
internal class BotPvpRespawnHook
@Inject
constructor(private val population: BotPopulation) : PlayerRespawnHook {
    override fun respawn(player: Player): CoordGrid? =
        if (population.isPvpBot(player)) EDGEVILLE_RESPAWN else null

    internal companion object {
        val EDGEVILLE_RESPAWN: CoordGrid = CoordGrid(3093, 3493)
    }
}
