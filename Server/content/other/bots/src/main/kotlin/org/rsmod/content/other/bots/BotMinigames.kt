package org.rsmod.content.other.bots

import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlin.math.abs
import org.rsmod.api.player.interact.PlayerInteractions
import org.rsmod.api.player.stat.hitpoints
import org.rsmod.content.other.castlewars.bots.CastleWarsBots
import org.rsmod.content.other.castlewars.CastleWarsGame
import org.rsmod.game.entity.Player
import org.rsmod.game.interact.InteractionOp
import org.rsmod.game.interact.InteractionPlayerOp
import org.rsmod.map.CoordGrid

@Singleton
public class BotMinigames @Inject internal constructor(
    private val castleWars: CastleWarsBots,
    private val game: CastleWarsGame,
    private val interactions: PlayerInteractions,
    private val actions: BotActions,
) {
    private data class Pursuit(var coords: CoordGrid, var stationary: Int = 0)
    private val pursuits = HashMap<Player, Pursuit>()

    public val count: Int
        get() = castleWars.count

    public fun fill(requester: Player, limit: Int): Int {
        val added = castleWars.fill(requester, limit.coerceIn(0, 40))
        if (added > 0 && !game.running) game.startGame()
        return added
    }

    public fun removeAll() {
        castleWars.removeAll()
        pursuits.clear()
    }

    public fun remove(player: Player) {
        pursuits.remove(player)
    }

    public fun tickCombat(player: Player, opponents: List<Player>) {
        if (!player.isSlotAssigned || player.hitpoints <= 0 ||
            player.isAccessProtected || player.isDelayed
        ) return
        val eligible = opponents.filter {
            it !== player && it.isSlotAssigned && it.hitpoints > 0 &&
                it.coords.level == player.coords.level && distance(player, it) <= 20
        }
        val current = player.interaction as? InteractionPlayerOp
        val target = current?.target?.takeIf { it in eligible }
            ?: eligible.minByOrNull { distance(player, it) }
        if (target == null) {
            if (current != null) {
                player.interaction = null
                player.routeRequest = null
            }
            pursuits.remove(player)
            return
        }
        val pursuit = pursuits.getOrPut(player) { Pursuit(player.coords) }
        if (pursuit.coords == player.coords) {
            pursuit.stationary++
        } else {
            pursuit.coords = player.coords
            pursuit.stationary = 0
        }
        if (pursuit.stationary >= 3 && distance(player, target) > 1) {
            pursuit.stationary = 0
            if (actions.operate(player, setOf("Door", "Gate"), "Open", radius = 2)) return
        }
        if (current?.target !== target || current.op != InteractionOp.Op2) {
            interactions.interact(player, target, InteractionOp.Op2)
        }
    }

    private fun distance(first: Player, second: Player): Int =
        maxOf(abs(first.coords.x - second.coords.x), abs(first.coords.z - second.coords.z))
}
