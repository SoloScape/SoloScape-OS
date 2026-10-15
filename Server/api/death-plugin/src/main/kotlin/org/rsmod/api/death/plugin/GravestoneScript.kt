package org.rsmod.api.death.plugin

import jakarta.inject.Inject
import org.rsmod.api.death.PlayerGravestones
import org.rsmod.api.game.process.GameLifecycle
import org.rsmod.api.player.output.mes
import org.rsmod.api.script.onCommand
import org.rsmod.api.script.onEvent
import org.rsmod.api.script.onOpLoc1
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

/** Public PvM gravestone recovery, shared with simulated player characters. */
public class GravestoneScript @Inject constructor(
    private val graves: PlayerGravestones,
) : PluginScript() {
    override fun ScriptContext.startup() {
        onEvent<GameLifecycle.Startup> { graves.load() }
        onEvent<GameLifecycle.StartCycle> { graves.tick() }
        onEvent<GameLifecycle.Shutdown> { graves.shutdown() }

        graves.markerSymbol()?.let { symbol ->
            onOpLoc1(symbol) { event ->
                val claimed = graves.reclaim(player, markerCoords = event.loc.coords)
                player.mes(if (claimed > 0) "Recovered $claimed items from your grave."
                    else "That is not your gravestone, or you have no inventory space.")
            }
        }

        // Supported even when the loaded cache has no suitable clickable grave model.
        onCommand("grave") {
            desc = "Locate your own gravestone and reclaim items when standing nearby"
            cheat {
                val grave = graves.grave(player)
                if (grave == null) {
                    player.mes("You have no unrecovered gravestone items.")
                } else if (grave.office) {
                    player.mes("Your gravestone expired. Use ::deathoffice to retrieve your items.")
                } else {
                    val remaining = (grave.remaining + 99) / 100
                    player.mes("Your grave is at ${grave.coords.x}, ${grave.coords.z} " +
                        "(floor ${grave.coords.level}), with about $remaining minutes remaining.")
                    val claimed = graves.reclaim(player)
                    if (claimed > 0) player.mes("Recovered $claimed items from your grave.")
                    else player.mes("Stand within 3 tiles of your grave with inventory space to recover.")
                }
            }
        }
        onCommand("deathoffice") {
            desc = "Retrieve items from an expired PvM gravestone"
            cheat {
                val grave = graves.grave(player)
                if (grave?.office != true) {
                    player.mes("You have no expired gravestone items in Death's Office.")
                } else {
                    val claimed = graves.reclaim(player, fromOffice = true)
                    player.mes(if (claimed > 0) "Death returned $claimed of your items."
                        else "Make some inventory space before reclaiming your items.")
                }
            }
        }
    }
}
