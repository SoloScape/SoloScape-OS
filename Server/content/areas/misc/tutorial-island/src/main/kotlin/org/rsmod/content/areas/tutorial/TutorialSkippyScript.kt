package org.rsmod.content.areas.tutorial

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.types.NpcMode
import jakarta.inject.Inject
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.api.repo.npc.NpcRepository
import org.rsmod.api.script.onGameStartup
import org.rsmod.api.script.onOpNpc1
import org.rsmod.game.entity.Npc
import org.rsmod.game.map.Direction
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

public class TutorialSkippyScript @Inject constructor(
    private val npcs: NpcRepository,
    private val progress: TutorialProgress,
) : PluginScript() {
    /**
     * SoloScape exposes Skippy as an optional island shortcut. Official OSRS
     * only spawns him during selected events, but here players can talk to him
     * on every new character after accepting their appearance.
     *
     * Set -Dsoloscape.tutorial.skip=false or SOLOSCAPE_TUTORIAL_SKIP=false
     * to enforce the full, unskippable OSRS tutorial instead.
     */
    private val skipEnabled: Boolean
        get() {
            val configured = System.getProperty("soloscape.tutorial.skip")
                ?: System.getenv("SOLOSCAPE_TUTORIAL_SKIP")
            return configured?.equals("false", ignoreCase = true) != true &&
                configured != "0"
        }

    override fun ScriptContext.startup() {
        onGameStartup {
            if (!skipEnabled) return@onGameStartup
            if (npcs.findAll(SPAWN).none { it.id == NPC.asRSCM() }) {
                val cached = checkNotNull(ServerCacheManager.getNpc(NPC.asRSCM()))
                val type = cached.copy(wanderRange = 0, defaultMode = NpcMode.None).also {
                    it.paramMap = cached.paramMap
                }
                val npc = Npc(type, SPAWN).apply {
                    respawnDir = Direction.South
                    faceDirection(Direction.South)
                    movementLocked = true
                }
                npcs.add(npc, Int.MAX_VALUE)
            }
        }
        onOpNpc1(NPC) {
            if (!skipEnabled || !player.onTutorial ||
                !TutorialProgress.onIsland(player.coords)) return@onOpNpc1
            // The first appearance-editor screen is mandatory. Skippy must
            // never become another route around its Accept button.
            if (player.tutorialAppearancePending) {
                progress.ensureAppearanceCreation(player)
                return@onOpNpc1
            }
            startDialogue(it.npc) {
                chatNpc(neutral, "Want to skip the lessons and head for the mainland?")
                while (true) {
                    when (choice4(
                        "Send me to the mainland.", 1,
                        "Who are you?", 2,
                        "Can I decide later?", 3,
                        "I'll stay for the tutorial.", 4,
                    )) {
                        1 -> {
                            chatNpc(neutral, "I can take you straight to Lumbridge, but you'll miss " +
                                "the lessons and the Learning the Ropes Quest Point.")
                            val confirmed = choice2(
                                "Yes, take me to Lumbridge.", true,
                                "No, I'll finish my training.", false,
                            )
                            if (!confirmed) {
                                chatNpc(happy, "Suit yourself! Come back if you change your mind.")
                                return@startDialogue
                            }
                            // Revalidate before granting rewards and using an exempt teleport.
                            if (!player.onTutorial || player.tutorialAppearancePending ||
                                !TutorialProgress.onIsland(player.coords)) return@startDialogue
                            chatNpc(happy, "All right! Good luck out there, adventurer.")
                            access.ifCloseChat()
                            progress.complete(player)
                            access.telejump(TutorialProgress.LUMBRIDGE, TeleportType.Exempt)
                            return@startDialogue
                        }
                        2 -> chatNpc(neutral, "Skippy's the name. I'm usually near Rimmington, " +
                            "but they've put me in charge of getting seasoned adventurers " +
                            "through here faster.")
                        3 -> {
                            chatNpc(happy, "Of course. Have a look around, and come talk to " +
                                "me when you've decided.")
                            return@startDialogue
                        }
                        4 -> {
                            chatNpc(happy, "Good choice! The instructors will show you the ropes.")
                            return@startDialogue
                        }
                    }
                }
            }
        }
    }

    public companion object {
        public const val NPC: String = "npc.tutorial_skip"
        public val SPAWN: CoordGrid = CoordGrid(3097, 3108, 0)
    }
}
