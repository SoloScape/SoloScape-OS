package org.rsmod.content.other.bots

import dev.or2.central.account.Rights
import jakarta.inject.Inject
import java.util.IdentityHashMap
import org.rsmod.api.game.process.GameLifecycle
import org.rsmod.api.player.output.mes
import org.rsmod.api.script.onCommand
import org.rsmod.api.script.onEvent
import org.rsmod.game.MapClock
import org.rsmod.game.entity.Player
import org.rsmod.game.entity.player.PublicMessage
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class BotPopulationScript @Inject constructor(
    private val population: BotPopulation,
    private val minigames: BotMinigames,
    private val social: BotSocial,
    private val clock: MapClock,
    private val registry: org.rsmod.api.registry.player.PlayerRegistry,
) : PluginScript() {
    private val heard = IdentityHashMap<Player, PublicMessage>()

    override fun ScriptContext.startup() {
        onEvent<GameLifecycle.Startup> { population.startup() }
        onEvent<GameLifecycle.StartCycle> { population.tick(clock.cycle) }
        onEvent<GameLifecycle.LateCycle> {
            for (player in registry.playerList) {
                if (population.isBot(player)) continue
                val message = player.publicMessage ?: continue
                if (heard.put(player, message) !== message && message.clanType == null) {
                    social.hear(player, message.text, population.players(), clock.cycle)
                }
            }
            heard.keys.removeIf { !it.isSlotAssigned }
        }
        onEvent<GameLifecycle.Shutdown> { population.removeAll() }
        onCommand("botinfo") {
            desc = "Show bot population and activity"
            requiredRights = Rights.ADMINISTRATOR
            cheat {
                player.mes("Bots: ${population.count}; Castle Wars: ${minigames.count}")
                population.describe().forEach { player.mes(it) }
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

    override fun ScriptContext.shutdown() { population.removeAll() }
}
