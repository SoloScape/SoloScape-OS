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
        onCommand("bots") {
            desc = "Add bots: ::bots skilling|progressive|combat|wildy|trade|dropparty|clana|clanb|castlewars|all [count] [novice|standard|veteran|elite]"
            requiredRights = Rights.ADMINISTRATOR
            cheat {
                val mode = args.firstOrNull()?.lowercase() ?: "all"
                val requested = args.getOrNull(1)?.toIntOrNull()
                val difficultyText = args.getOrNull(2)
                val difficulty = difficultyText?.let(BotPvpDifficulty::parse)
                if (difficultyText != null && difficulty == null) {
                    player.mes("Difficulty must be novice, standard, veteran or elite.")
                    return@cheat
                }
                if (requested != null && requested !in 1..BotPopulation.MAX_BOTS) {
                    player.mes("Count must be between 1 and ${BotPopulation.MAX_BOTS}.")
                    return@cheat
                }
                val added = when (mode) {
                    "castlewars", "castle_wars" -> minigames.fill(player, requested ?: 2)
                    "all" -> {
                        var total = 0
                        for (kind in BotMode.entries) {
                            val amount = requested ?: when (kind) {
                                BotMode.Skilling -> 50
                                BotMode.Progressive -> 10
                                BotMode.Wilderness -> 30
                                BotMode.Trade -> 50
                                BotMode.DropParty, BotMode.ClanOne, BotMode.ClanTwo -> 20
                                BotMode.Combat -> 0
                            }
                            total += if (difficulty == null) population.spawn(kind, amount)
                                else population.spawn(kind, amount, difficulty)
                        }
                        total + minigames.fill(player, requested ?: 2)
                    }
                    else -> {
                        val kind = BotMode.parse(mode)
                        if (kind == null) {
                            player.mes("Unknown bot mode. Use ::bots all or ::botinfo.")
                            return@cheat
                        }
                        if (difficulty == null) population.spawn(kind, requested ?: 1)
                        else population.spawn(kind, requested ?: 1, difficulty)
                    }
                }
                player.mes("Added $added bots. Total: ${population.count}.")
            }
        }
        onCommand("botsoff") {
            desc = "Remove world and minigame bots, saving progressive profiles"
            requiredRights = Rights.ADMINISTRATOR
            cheat {
                val count = population.count
                population.removeAll()
                player.mes("Removed $count bots.")
            }
        }
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
