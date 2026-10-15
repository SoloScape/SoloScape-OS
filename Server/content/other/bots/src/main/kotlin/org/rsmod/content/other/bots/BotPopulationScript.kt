package org.rsmod.content.other.bots

import dev.or2.central.account.Rights
import jakarta.inject.Inject
import java.util.IdentityHashMap
import org.rsmod.api.game.process.GameLifecycle
import org.rsmod.api.player.events.PlayerHitEvents
import org.rsmod.api.player.output.mes
import org.rsmod.api.script.onCommand
import org.rsmod.api.script.onEvent
import org.rsmod.game.MapClock
import org.rsmod.game.entity.NpcList
import org.rsmod.game.entity.Player
import org.rsmod.game.entity.player.PublicMessage
import org.rsmod.game.entity.player.SessionStateEvent
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class BotPopulationScript @Inject constructor(
    private val population: BotPopulation,
    private val minigames: BotMinigames,
    private val social: BotSocial,
    private val clock: MapClock,
    private val registry: org.rsmod.api.registry.player.PlayerRegistry,
    private val npcs: NpcList,
    private val highscores: BotHighscores,
) : PluginScript() {
    private val heard = IdentityHashMap<Player, PublicMessage>()

    override fun ScriptContext.startup() {
        onEvent<GameLifecycle.Startup> {
            highscores.start()
            population.startup()
            highscores.capture(registry.playerList.filterNotNull(), population::isBot)
        }
        onEvent<GameLifecycle.StartCycle> { population.tick(clock.cycle) }
        // A blocked NPC hit (0 damage) is still an attack: flee before a lethal hit.
        onEvent<PlayerHitEvents.Impact> {
            if (hit.isFromNpc) {
                population.onNpcAttack(player, hit.resolveNpcSource(npcs)?.coords, clock.cycle)
            }
        }
        onEvent<GameLifecycle.LateCycle> {
            // Refresh online player and bot XP every ~30 seconds, without reading mutable
            // Player state from an HTTP worker thread.
            if (clock.cycle % 50 == 0) {
                highscores.capture(registry.playerList.filterNotNull(), population::isBot)
            }
            for (player in registry.playerList) {
                if (population.isBot(player)) continue
                val message = player.publicMessage ?: continue
                if (heard.put(player, message) !== message && message.clanType == null) {
                    if (!population.hearPlayerTeamReply(player, message.text, clock.cycle)) {
                        social.hear(player, message.text,
                            population.players().filterNot(population::isPvpBot), clock.cycle)
                    }
                }
            }
            heard.keys.removeIf { !it.isSlotAssigned }
        }
        onEvent<SessionStateEvent.Delete> {
            // Registry.Del fires while stat data still exists. Bots may already have been
            // removed from the population map, so preserve their known worldbot_ identity.
            highscores.departing(player, population.isBot(player) ||
                player.username.startsWith("worldbot_"))
        }
        onEvent<GameLifecycle.Shutdown> {
            population.removeAll()
            highscores.stop()
        }
        onCommand("botinfo") {
            desc = "Show bot population and activity"
            requiredRights = Rights.ADMINISTRATOR
            cheat {
                player.mes("Bots: ${population.count}; Castle Wars: ${minigames.count}")
                population.describe().forEach { player.mes(it) }
            }
        }
        onCommand("botdebug") {
            desc = "Export bot diagnostics: ::botdebug on|off"
            requiredRights = Rights.ADMINISTRATOR
            cheat {
                when (args.firstOrNull()?.lowercase()) {
                    "on" -> player.mes(population.debug(true))
                    "off" -> player.mes(population.debug(false))
                    else -> player.mes("Usage: ::botdebug on|off")
                }
            }
        }
        onCommand("botstress") {
            desc = "Measure bot performance: ::botstress [ticks] [warmup] or stop"
            requiredRights = Rights.ADMINISTRATOR
            cheat {
                if (args.firstOrNull()?.equals("stop", true) == true) {
                    BotMetrics.stop()
                    player.mes("Bot performance measurement stopped.")
                    return@cheat
                }
                val ticks = args.getOrNull(0)?.toIntOrNull() ?: if (args.isEmpty()) 500 else -1
                val warmup = args.getOrNull(1)?.toIntOrNull() ?: if (args.size < 2) 100 else -1
                if (args.size > 2 || ticks !in 1..5000 || warmup !in 0..1000) {
                    player.mes("Usage: ::botstress [ticks 1..5000] [warmup 0..1000] or stop")
                    return@cheat
                }
                val started = BotMetrics.start(clock.cycle, ticks, warmup) { lines ->
                    if (player.isSlotAssigned) lines.forEach { player.mes(it) }
                }
                player.mes(if (started) "Bot measurement: $warmup warmup ticks, then $ticks ticks."
                    else "A bot measurement is already running.")
            }
        }
        onCommand("bottasks") {
            desc = "List imported bot tasks, optionally filtered by kind"
            requiredRights = Rights.ADMINISTRATOR
            cheat {
                val filter = args.firstOrNull()
                SourceBotCatalog.tasks.filter {
                    filter == null || it.kind.name.equals(filter, true)
                }.forEach { player.mes("${it.id} [${it.kind}] weight=${it.weight}") }
            }
        }
        onCommand("bottrade") {
            desc = "Quote or confirm a bot trade: ::bottrade <bot name> <quantity> [confirm]"
            cheat {
                val confirm = args.lastOrNull()?.equals("confirm", true) == true
                val values = if (confirm) args.dropLast(1) else args.toList()
                val quantity = values.lastOrNull()?.toIntOrNull()
                val name = values.dropLast(1).joinToString(" ")
                if (quantity == null || name.isBlank()) {
                    player.mes("Usage: ::bottrade <bot name> <quantity> [confirm]")
                    return@cheat
                }
                player.mes(social.trade(player, name, quantity, confirm))
            }
        }
    }

    override fun ScriptContext.shutdown() {
        population.removeAll()
        highscores.stop()
    }
}
