package org.rsmod.content.areas.tutorial

import dev.openrune.rscm.RSCM.asRSCM
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.rsmod.api.player.output.mes
import org.rsmod.api.player.output.runClientScript
import org.rsmod.api.player.ui.ifSetHide
import org.rsmod.api.player.ui.ifSetText
import org.rsmod.api.player.vars.intVarp
import org.rsmod.game.entity.Player
import org.rsmod.map.CoordGrid

public var Player.tutorialProgress: Int by intVarp("varp.tutorial")
private var Player.tutorialProgressBar: Int by intVarp("varp.tutorial_progress_overlay")

public val Player.tutorialStage: TutorialStage?
    get() = TutorialStage.fromCode(tutorialProgress)

public val Player.onTutorial: Boolean
    get() = tutorialProgress in 1 until TutorialStage.COMPLETE.code

@Singleton
public class TutorialProgress @Inject constructor() {
    public fun advance(player: Player, expected: TutorialStage): Boolean {
        if (!TutorialStage.accepts(player.tutorialStage ?: return false, expected)) return false
        player.tutorialProgress = expected.next.code
        show(player)
        return true
    }

    public fun show(player: Player) {
        val stage = player.tutorialStage ?: return
        player.tutorialProgressBar = stage.ordinal * 20 / TutorialStage.COMPLETE.ordinal
        player.mes("<col=ffff00>Tutorial Island: ${stage.instruction}</col>")
        if (player.onTutorial && player.ui.containsOverlay("interface.tutorial_overlay")) {
            player.ifSetText("component.tutorial_overlay:hint_text_1", stage.lesson)
            val lines = hintLines(stage.instruction)
            for (line in 0..2) {
                player.ifSetText("component.tutorial_overlay:hint_text_${line + 2}",
                    lines.getOrElse(line) { "" })
            }
            player.ifSetHide("component.tutorial_overlay:progressbar_container", false)
            player.runClientScript(867, "component.tutorial_overlay:progressbar".asRSCM())
        }
    }

    public companion object {
        public val START: CoordGrid = CoordGrid(3094, 3107)
        public val LUMBRIDGE: CoordGrid = CoordGrid(3222, 3218)

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
