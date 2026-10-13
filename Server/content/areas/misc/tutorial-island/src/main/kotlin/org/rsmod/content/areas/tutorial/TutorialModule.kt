package org.rsmod.content.areas.tutorial

import jakarta.inject.Inject
import org.rsmod.api.area.checker.AreaChecker
import org.rsmod.api.player.hook.PlayerPostTickHook
import org.rsmod.api.player.hook.PlayerTeleportValidateHook
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.game.entity.Player
import org.rsmod.plugin.module.PluginModule

public class TutorialModule : PluginModule() {
    override fun bind() {
        addSetBinding<PlayerPostTickHook>(TutorialTickHook::class.java)
        addSetBinding<PlayerTeleportValidateHook>(TutorialTeleportHook::class.java)
    }
}

public class TutorialTickHook @Inject constructor(private val progress: TutorialProgress) :
    PlayerPostTickHook {
    override fun onPostTick(player: Player) {
        if (!player.onTutorial) return
        // Also repair an online character whose save predates the optional-lessons update.
        if (player.tutorialStage?.legacyOptional == true) progress.show(player)
        player.attr[tutorialPassage]?.let {
            if (player.coords == it.destination) {
                player.attr.remove(tutorialPassage)
                progress.advance(player, it.stage)
            }
        }
        when (player.tutorialStage) {
            TutorialStage.EQUIP_SWORD -> if (player.worn.contains("obj.bronze_sword") &&
                player.worn.contains("obj.wooden_shield"))
                progress.advance(player, TutorialStage.EQUIP_SWORD)
            TutorialStage.IGNORE -> if (player.ui.containsOverlay("interface.ignore"))
                progress.advance(player, TutorialStage.IGNORE)
            TutorialStage.BANK -> if (player.ui.containsModal("interface.bankmain"))
                progress.advance(player, TutorialStage.BANK)
            else -> Unit
        }
    }
}

public class TutorialTeleportHook @Inject constructor() : PlayerTeleportValidateHook {
    override fun validate(player: Player, type: TeleportType, areaChecker: AreaChecker): String? =
        if (player.onTutorial) "Finish your training, then cast Lumbridge Home Teleport to leave Tutorial Island."
        else null
}
