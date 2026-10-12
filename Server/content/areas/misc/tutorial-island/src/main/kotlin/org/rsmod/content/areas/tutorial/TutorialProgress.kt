package org.rsmod.content.areas.tutorial

import dev.openrune.rscm.RSCM.asRSCM
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.rsmod.api.player.output.mes
import org.rsmod.api.player.output.runClientScript
import org.rsmod.api.player.ui.ifCloseOverlay
import org.rsmod.api.player.ui.ifOpenOverlay
import org.rsmod.api.player.ui.ifSetHide
import org.rsmod.api.player.ui.ifSetText
import org.rsmod.api.player.vars.intVarp
import org.rsmod.api.player.vars.boolVarBit
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player
import org.rsmod.game.ui.Component
import org.rsmod.map.CoordGrid

public var Player.tutorialProgress: Int by intVarp("varp.tutorial")
private var Player.tutorialProgressBar: Int by intVarp("varp.tutorial_progress_overlay")
private var Player.newTutorialAccount: Boolean by boolVarBit("varbit.new_player_account")

public val Player.tutorialStage: TutorialStage?
    get() = TutorialStage.fromCode(tutorialProgress)

public val Player.onTutorial: Boolean
    get() = tutorialProgress in 1 until TutorialStage.COMPLETE.code

@Singleton
public class TutorialProgress @Inject constructor(private val eventBus: EventBus) {
    public fun open(player: Player) {
        player.ifOpenOverlay("interface.tutorial_overlay",
            "component.toplevel_osrs_stretch:overlay_hud", eventBus)
        show(player)
    }

    public fun advance(player: Player, expected: TutorialStage): Boolean {
        if (!TutorialStage.accepts(player.tutorialStage ?: return false, expected)) return false
        if (expected.next == TutorialStage.COMPLETE) {
            complete(player)
            return true
        }
        player.tutorialProgress = expected.next.code
        show(player)
        return true
    }

    public fun complete(player: Player) {
        player.tutorialProgress = TutorialStage.COMPLETE.code
        player.newTutorialAccount = false
        player.attr.remove(tutorialPassage)
        show(player)
    }

    public fun show(player: Player) {
        val stage = player.tutorialStage ?: return
        player.tutorialProgressBar = stage.ordinal * 20 / TutorialStage.COMPLETE.ordinal
        if (!player.onTutorial) {
            player.ifCloseOverlay("interface.tutorial_overlay", eventBus)
            player.ifCloseOverlay("interface.messagebox_titled", eventBus)
            syncTabs(player, stage)
            player.mes(stage.instruction)
            return
        }
        if (player.ui.containsOverlay("interface.tutorial_overlay")) {
            syncTabs(player, stage)
            if (!player.ui.containsOverlay("interface.messagebox_titled")) {
                player.ifOpenOverlay("interface.messagebox_titled", "component.chatbox:chatoverlay", eventBus)
            }
            player.ifSetText("component.messagebox_titled:title", stage.lesson)
            player.ifSetText("component.messagebox_titled:text", stage.instruction)
            player.ifSetHide("component.messagebox_titled:continue", true)
            // Instructions live in the chat overlay; the native top-left hints are separate.
            player.ifSetHide("component.tutorial_overlay:hint_layer", true)
            player.ifSetHide("component.tutorial_overlay:progressbar_container", false)
            player.runClientScript(867, "component.tutorial_overlay:progressbar".asRSCM())
        }
    }

    private fun syncTabs(player: Player, stage: TutorialStage) {
        for ((slot, tab, lesson) in TABS) {
            val unlocked = stage.code >= lesson.code
            val interf = "interface.$tab"
            val target = "component.toplevel_osrs_stretch:side$slot"
            val occupied = Component(target.asRSCM()) in player.ui.overlays
            // Friends and Ignore share a slot. Keep the player's selected variant open.
            if (unlocked && !occupied) {
                player.ifOpenOverlay(interf, target, eventBus)
            } else if (!unlocked && occupied) {
                val current = if (slot == 9 && player.ui.containsOverlay("interface.ignore"))
                    "interface.ignore" else interf
                player.ifCloseOverlay(current, eventBus)
            }
        }
    }

    public companion object {
        public val START: CoordGrid = CoordGrid(3094, 3107)
        public val LUMBRIDGE: CoordGrid = CoordGrid(3222, 3218)

        private data class Tab(val slot: Int, val interf: String, val lesson: TutorialStage)
        private val TABS = listOf(
            Tab(0, "combat_interface", TutorialStage.MELEE),
            Tab(1, "stats", TutorialStage.STATS),
            Tab(2, "side_journal", TutorialStage.JOURNAL),
            Tab(3, "inventory", TutorialStage.INVENTORY),
            Tab(4, "wornitems", TutorialStage.EQUIPMENT),
            Tab(5, "prayerbook", TutorialStage.PRAYER),
            Tab(6, "magic_spellbook", TutorialStage.SPELLBOOK),
            Tab(7, "side_channels", TutorialStage.COMPLETE),
            Tab(8, "account", TutorialStage.ACCOUNT),
            Tab(9, "friends", TutorialStage.FRIENDS),
            Tab(10, "logout", TutorialStage.GUIDE),
            Tab(11, "settings_side", TutorialStage.SETTINGS),
            Tab(12, "emote", TutorialStage.EMOTES),
            Tab(13, "music", TutorialStage.MUSIC),
        )

        public fun hintLines(text: String): List<String> {
            val lines = mutableListOf("")
            for (word in text.split(' ')) {
                val last = lines.last()
                if (last.isNotEmpty() && last.length + word.length + 1 > 40) lines.add(word)
                else lines[lines.lastIndex] = if (last.isEmpty()) word else "$last $word"
            }
            return lines
        }

        public fun onIsland(coords: CoordGrid): Boolean =
            coords.level == 0 && coords.x in 3050..3151 &&
                (coords.z in 3050..3151 || coords.z in 9450..9551)
    }
}
