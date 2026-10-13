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
     * Skippy is a Deadman-style convenience, not an NPC on the normal modern OSRS tutorial.
     * Default to the official no-skip route; private/dev worlds can opt in explicitly.
     */
    private val skipEnabled: Boolean
        get() = System.getProperty("soloscape.tutorial.skip") == "true" ||
            System.getenv("SOLOSCAPE_TUTORIAL_SKIP") == "true"

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
            if (!skipEnabled || !player.onTutorial) return@onOpNpc1
            startDialogue(it.npc) {
                chatNpc(neutral, "Would you like to skip the tutorial?")
                val skip = choice2("Yes", 1, "No", 2)
                access.ifCloseChat()
                if (skip != 1) return@startDialogue
                progress.complete(player)
                access.telejump(TutorialProgress.LUMBRIDGE, TeleportType.Exempt)
            }
        }
    }

    public companion object {
        public const val NPC: String = "npc.tutorial_skip"
        public val SPAWN: CoordGrid = CoordGrid(3097, 3108, 0)
    }
}
