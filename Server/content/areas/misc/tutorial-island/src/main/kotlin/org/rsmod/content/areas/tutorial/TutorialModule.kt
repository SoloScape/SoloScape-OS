package org.rsmod.content.areas.tutorial

import jakarta.inject.Inject
import org.rsmod.api.area.checker.AreaChecker
import org.rsmod.api.attr.AttributeKey
import org.rsmod.api.player.hook.PlayerPostTickHook
import org.rsmod.api.player.hook.PlayerRestrictionHook
import org.rsmod.api.player.hook.RestrictedAction
import org.rsmod.api.player.hook.PlayerTeleportValidateHook
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.game.entity.Player
import org.rsmod.plugin.module.PluginModule

public class TutorialModule : PluginModule() {
    override fun bind() {
        addSetBinding<PlayerPostTickHook>(TutorialTickHook::class.java)
        addSetBinding<PlayerRestrictionHook>(TutorialAppearanceRestrictionHook::class.java)
        addSetBinding<PlayerTeleportValidateHook>(TutorialTeleportHook::class.java)
    }
}

private val appearanceConfirmed = AttributeKey<Int>("tutorial_appearance_confirmed")

public val Player.tutorialDisplayNamePending: Boolean
    get() = onTutorial && displayName.isBlank()

/** Only accepting character creation (not closing its UI) unlocks tutorial movement. */
public val Player.tutorialAppearancePending: Boolean
    get() = tutorialStage == TutorialStage.GUIDE &&
        attr[appearanceConfirmed] != 1

public val Player.tutorialFamiliarityPending: Boolean
    get() = tutorialStage == TutorialStage.GUIDE && !tutorialAppearancePending &&
        tutorialFamiliarity == 0

public val Player.tutorialSetupPending: Boolean
    get() = tutorialDisplayNamePending || tutorialAppearancePending || tutorialFamiliarityPending

public class TutorialAppearanceRestrictionHook @Inject constructor() : PlayerRestrictionHook {
    override fun restriction(player: Player, action: RestrictedAction): String? =
        if (player.tutorialSetupPending &&
            (action == RestrictedAction.Walk || action == RestrictedAction.CloseModal)) {
            if (player.tutorialDisplayNamePending) "Choose your display name before continuing."
            else if (player.tutorialAppearancePending) "Accept your character's appearance before continuing."
            else "Select your experience with Old School RuneScape before continuing."
        } else {
            null
        }
}

public class TutorialTickHook @Inject constructor(private val progress: TutorialProgress) :
    PlayerPostTickHook {
    override fun onPostTick(player: Player) {
        if (!player.onTutorial) return
        if (player.tutorialSetupPending) {
            // Also neutralise existing routes, including automatic approaches to NPCs
            // or objects, and restore the editor if another interface displaced it.
            player.routeRequest = null
            player.routeDestination.clear()
            progress.ensureAppearanceCreation(player)
            return
        }
        // Also repair an online character whose save predates the optional-lessons update.
        if (player.tutorialStage?.legacyOptional == true) progress.show(player)
        player.attr[tutorialPassage]?.let {
            if (player.coords == it.destination) {
                player.attr.remove(tutorialPassage)
                progress.advance(player, it.stage)
            }
        }
        when (player.tutorialStage) {
            TutorialStage.IRONMAN_TUTOR -> if (player.gamemode != 0) {
                player.tutorialProgress = TutorialStage.DEPART.code
                progress.show(player)
            }
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
