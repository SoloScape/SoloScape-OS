package org.rsmod.content.quest.manager

import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import org.rsmod.api.player.output.runClientScript
import org.rsmod.api.player.vars.intVarBit
import org.rsmod.api.script.onPlayerLogin
import org.rsmod.api.table.QuestRow
import org.rsmod.game.entity.Player
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

private const val MINIQUEST_TYPE = 1

/**
 * Pushes the ids of every quest that has a server-side implementation to the client on login. The
 * overridden `[proc,questlist_hide_quest]` hides any quest journal row whose id is missing from that
 * list, and the quest point / completion totals are lowered to match, so the quest tab only counts
 * quests that can actually be played.
 */
class QuestVisibilityScript : PluginScript() {
    private var Player.questPointsMax by intVarBit("varbit.qp_max")
    private var Player.questsTotalCount by intVarBit("varbit.quests_total_count")

    private val totalQuestPoints: Int by lazy { Quest.all().sumOf { it.questPoints } }

    private val totalQuests: Int by lazy {
        Quest.all().count { QuestRow.getRow(it.rowID).type != MINIQUEST_TYPE }
    }

    override fun ScriptContext.startup() {
        onPlayerLogin {
            refresh(player)
            player.questPointsMax = totalQuestPoints
            player.questsTotalCount = totalQuests
        }
    }

    companion object {
        fun refresh(player: Player) {
            val quests = Quest.all().filter { it.visibleInJournal(player) }
            val ids = quests.joinToString(",", ",", ",") { it.id.toString() }
            player.runClientScript(
                "clientscript.quest_available_set".asRSCM(RSCMType.CLIENTSCRIPT), ids)
        }
    }
}
