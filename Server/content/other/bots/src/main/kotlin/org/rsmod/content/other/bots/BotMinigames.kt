package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import jakarta.inject.Inject
import kotlin.random.Random
import jakarta.inject.Singleton
import kotlin.math.abs
import org.rsmod.api.player.interact.PlayerInteractions
import org.rsmod.api.player.stat.hitpoints
import org.rsmod.content.other.castlewars.bots.CastleWarsBots
import org.rsmod.content.other.castlewars.CastleWarsGame
import org.rsmod.game.entity.Player
import org.rsmod.game.interact.InteractionOp
import org.rsmod.game.interact.InteractionPlayerOp
import org.rsmod.game.movement.RouteRequestPathingEntity
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
    private data class Invitation(val speaker: Player, val expires: Int)
    private val invitations = LinkedHashMap<Player, Invitation>()
    private val memberships = LinkedHashMap<Player, Int>()
    private var nextGroup = 1

    public val groupMembership: Map<Player, Int>
        get() = memberships.toMap()

    public fun allied(first: Player, second: Player): Boolean {
        if (first === second) return true
        val group = memberships[first] ?: return false
        return memberships[second] == group
    }

    public fun hear(speaker: Player, message: String, bots: List<Player>, cycle: Int) {
        pruneTeams(cycle)
        if (!speaker.isSlotAssigned || speaker.hitpoints <= 0 || speaker in bots) return
        val nearby = bots.filter {
            it.isSlotAssigned && it.hitpoints > 0 &&
                it.coords.level == speaker.coords.level && distance(speaker, it) <= 15
        }
        when (classifyTeamMessage(message)) {
            TeamMessage.Invite -> {
                val bot = nearby.filter { it !in memberships && it !in invitations }
                    .minByOrNull { distance(speaker, it) } ?: return
                if (memberships.size >= MAX_MEMBERS || invitations.size >= MAX_INVITATIONS ||
                    (memberships[speaker]?.let { groupSize(it) } ?: 1) >= MAX_GROUP_SIZE
                ) {
                    bot.say("nty")
                    return
                }
                invitations[bot] = Invitation(speaker, cycle + INVITE_DURATION)
                bot.say("Team? Say sure, okay, ok or k to confirm.")
            }
            TeamMessage.Accept -> {
                val bot = invitations.entries.firstOrNull {
                    it.value.speaker === speaker && it.key in nearby
                }?.key ?: return
                invitations.remove(bot)
                if (memberships.size + 2 > MAX_MEMBERS) return
                val group = memberships.getOrPut(speaker) { nextGroup++ }
                if (groupSize(group) >= MAX_GROUP_SIZE) return
                memberships[bot] = group
                clearAlliedTarget(bot)
                bot.say(ACCEPT_RESPONSES.random())
            }
            TeamMessage.Reject -> {
                for (bot in invitations.entries.filter { it.value.speaker === speaker }.map { it.key }) {
                    invitations.remove(bot)
                }
            }
            TeamMessage.Leave -> {
                for (bot in nearby.filter { allied(speaker, it) }) {
                    bot.say("cya")
                    clearAlliedTarget(bot)
                }
                memberships.remove(speaker)
                invitations.entries.removeAll { it.value.speaker === speaker }
                dissolveSmallGroups()
            }
            TeamMessage.Food -> for (bot in nearby.filter { allied(speaker, it) }) {
                val food = bot.inv.filterNotNull { held ->
                    ServerCacheManager.getItem(held.id)?.interfaceOptions?.any {
                        it.equals("Eat", true)
                    } == true
                }
                val count = food.sumOf { it.count }
                val names = food.mapNotNull { ServerCacheManager.getItem(it.id)?.name }.distinct()
                bot.say("I have $count ${names.joinToString("/").ifEmpty { "food" }} left")
            }
            TeamMessage.Stats -> for (bot in nearby.filter { allied(speaker, it) }) {
                bot.say(COMBAT_STATS.joinToString(" ") { (label, stat) ->
                    "$label: ${bot.statMap.getBaseLevel(stat).toInt()}"
                })
            }
            null -> Unit
        }
    }

    private fun pruneTeams(cycle: Int) {
        invitations.entries.removeAll {
            it.value.expires < cycle || !it.key.isSlotAssigned ||
                !it.value.speaker.isSlotAssigned || it.key.hitpoints <= 0 ||
                it.value.speaker.hitpoints <= 0
        }
        memberships.keys.removeAll { !it.isSlotAssigned || it.hitpoints <= 0 }
        dissolveSmallGroups()
    }

    private fun groupSize(group: Int): Int = memberships.values.count { it == group }

    private fun dissolveSmallGroups() {
        val small = memberships.values.groupingBy { it }.eachCount().filterValues { it < 2 }.keys
        memberships.entries.removeAll { it.value in small }
    }

    private fun clearAlliedTarget(player: Player) {
        val current = player.interaction as? InteractionPlayerOp ?: return
        if (allied(player, current.target)) {
            player.interaction = null
            player.routeRequest = null
        }
    }


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
        invitations.clear()
        memberships.clear()
    }

    public fun remove(player: Player) {
        pursuits.remove(player)
        invitations.remove(player)
        invitations.entries.removeAll { it.value.speaker === player }
        memberships.remove(player)
        dissolveSmallGroups()
    }

    public fun tickCombat(player: Player, opponents: List<Player>) {
        pruneTeams(player.currentMapClock)
        if (!player.isSlotAssigned || player.hitpoints <= 0 ||
            player.isAccessProtected || player.isDelayed
        ) return
        val eligible = opponents.filter {
            !allied(player, it) && it.isSlotAssigned && it.hitpoints > 0 &&
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
            val group = memberships[player]
            val members = memberships.filterValues { it == group }.keys.toList()
            val index = members.indexOf(player)
            val follow = members.getOrNull(index - 1)
            if (group != null && follow != null && distance(player, follow) > 2 &&
                player.coords.level == follow.coords.level
            ) {
                player.routeRequest = RouteRequestPathingEntity(follow.avatar)
            }
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

    public enum class TeamMessage { Invite, Accept, Reject, Leave, Food, Stats }

    public companion object {
        public const val INVITE_DURATION: Int = 30
        public const val MAX_GROUP_SIZE: Int = 8
        public const val MAX_MEMBERS: Int = 256
        public const val MAX_INVITATIONS: Int = 128
        private val ACCEPT_RESPONSES = listOf("sure", "okay", "ok", "k")
        private val COMBAT_STATS = listOf(
            "atk" to "stat.attack", "def" to "stat.defence", "str" to "stat.strength",
            "mage" to "stat.magic", "range" to "stat.ranged", "hp" to "stat.hitpoints",
            "pray" to "stat.prayer",
        )
        public fun classifyTeamMessage(message: String): TeamMessage? = when (
            message.trim().lowercase()
        ) {
            "team", "team?" -> TeamMessage.Invite
            "sure", "okay", "ok", "k" -> TeamMessage.Accept
            "nty", "nah", "no", "nope", "no thanks" -> TeamMessage.Reject
            "leave", "g2g", "bye", "cya" -> TeamMessage.Leave
            "food", "food?", "food left", "food left?" -> TeamMessage.Food
            "skills", "skills?", "lvls", "lvls?", "stats", "stats?" -> TeamMessage.Stats
            else -> null
        }
    }

    private fun distance(first: Player, second: Player): Int =
        maxOf(abs(first.coords.x - second.coords.x), abs(first.coords.z - second.coords.z))
}
