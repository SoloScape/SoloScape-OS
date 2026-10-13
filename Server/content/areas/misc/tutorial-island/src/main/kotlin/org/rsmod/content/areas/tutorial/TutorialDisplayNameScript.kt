package org.rsmod.content.areas.tutorial

import dev.openrune.definition.type.widget.IfEvent
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import java.sql.SQLException
import org.rsmod.api.account.character.main.InitialDisplayNameRepository
import org.rsmod.api.attr.AttributeKey
import org.rsmod.api.player.input.StringDialogInput
import org.rsmod.api.player.output.runClientScript
import org.rsmod.api.player.ui.ifCloseModals
import org.rsmod.api.player.ui.ifSetEvents
import org.rsmod.api.player.ui.ifSetHide
import org.rsmod.api.player.ui.ifSetText
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.api.script.onEvent
import org.rsmod.api.script.onIfModalButton
import org.rsmod.api.script.onIfOpen
import org.rsmod.game.entity.Player
import org.rsmod.events.EventBus
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

public class TutorialDisplayNameScript @Inject constructor(
    private val names: InitialDisplayNameRepository,
    private val progress: TutorialProgress,
    private val eventBus: EventBus,
) : PluginScript() {
    private val candidate = AttributeKey<String>()
    private val inputComponents by lazy {
        listOf("look_up_name", "set_name", "name_text", "name_highlight", "name")
            .map { "component.tutorial_displayname:$it".asRSCM(RSCMType.COMPONENT) }
    }

    override fun ScriptContext.startup() {
        onIfOpen("interface.tutorial_displayname") {
            player.attr.remove(candidate)
            listOf("name", "look_up_name", "set_name").forEach { component ->
                player.ifSetEvents("component.tutorial_displayname:$component", 0..0, IfEvent.Op1)
            }
            player.pushInput("")
            player.allowInput()
        }
        onIfModalButton("component.tutorial_displayname:name") {
            player.allowInput()
        }
        onIfModalButton("component.tutorial_displayname:look_up_name") {
            player.attr[candidate]?.let { player.checkName(it) }
        }
        onEvent<StringDialogInput> {
            player.checkName(text.trim())
        }
        onIfModalButton("component.tutorial_displayname:set_name") {
            if (!player.canChooseName()) return@onIfModalButton
            val name = player.attr[candidate] ?: return@onIfModalButton
            val claimed = try {
                names.claim(player.characterId, player.accountId, name)
            } catch (_: SQLException) {
                player.status("Unable to set your name. Please look it up again.")
                player.attr.remove(candidate)
                player.pushInput("")
                player.allowInput()
                return@onIfModalButton
            }
            if (!claimed) {
                player.attr.remove(candidate)
                player.pushInput("")
                player.allowInput()
                player.status("That name is no longer available. Please choose another name.")
                return@onIfModalButton
            }
            player.displayName = name
            player.rebuildAppearance()
            VarPlayerIntMapSetter.set(player, "varbit.has_displayname_transmitter", 1)
            player.runNamingScript("script876", listOf(player.currentMapClock, 0, name, "REGULAR"))
            player.attr.remove(candidate)
            player.ifCloseModals(eventBus)
            progress.ensureAppearanceCreation(player)
        }
    }

    private fun Player.canChooseName(): Boolean =
        tutorialDisplayNamePending && ui.containsModal("interface.tutorial_displayname")

    private fun Player.checkName(name: String) {
        if (!canChooseName()) return
        attr[candidate] = name
        pushInput(name)
        allowInput()
        val available = try {
            names.available(name)
        } catch (_: SQLException) {
            attr.remove(candidate)
            pushInput("")
            allowInput()
            status("Name lookup is unavailable. Please try again.")
            return
        }
        if (!available) {
            status("That name is unavailable or invalid. Please choose another name.")
            return
        }
        status("The name <col=ffffff>$name</col> is available.")
        runNamingScript("displayname_button_draw", listOf(inputComponents[1], "Set name", 0))
        ifSetHide("component.tutorial_displayname:look_up_name", true)
        ifSetHide("component.tutorial_displayname:set_name", false)
    }

    private fun Player.status(text: String) {
        ifSetText("component.tutorial_displayname:status", text)
    }

    private fun Player.pushInput(name: String) {
        runNamingScript("tutorial_displayname_push_name", inputComponents + name)
    }

    private fun Player.allowInput() {
        if (canChooseName()) runNamingScript("tutorial_displayname_allow_input", inputComponents + 1)
    }

    private fun Player.runNamingScript(name: String, args: List<Any>) {
        runClientScript("clientscript.[clientscript,$name]".asRSCM(RSCMType.CLIENTSCRIPT), args)
    }
}
