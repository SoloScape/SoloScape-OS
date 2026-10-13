package org.rsmod.content.areas.tutorial

import dev.openrune.ServerCacheManager
import dev.openrune.definition.type.widget.IfEvent
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.rsmod.api.attr.AttributeKey
import org.rsmod.api.invtx.invAdd
import org.rsmod.api.player.midiJingle
import org.rsmod.api.player.output.HintArrows
import org.rsmod.api.player.output.mes
import org.rsmod.api.player.output.runClientScript
import org.rsmod.api.player.ui.ifCloseOverlay
import org.rsmod.api.player.ui.ifOpenOverlay
import org.rsmod.api.player.ui.ifOpenMain
import org.rsmod.api.player.ui.ifOpenMainModal
import org.rsmod.api.player.ui.ifSetObj
import org.rsmod.api.player.ui.ifSetHide
import org.rsmod.api.player.ui.ifSetText
import org.rsmod.api.player.ui.ifSetEvents
import org.rsmod.api.player.vars.intVarp
import org.rsmod.api.player.vars.boolVarBit
import org.rsmod.api.player.vars.intVarBit
import org.rsmod.content.quest.manager.Quest
import org.rsmod.content.quest.manager.QuestVisibilityScript
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player
import org.rsmod.game.entity.NpcList
import org.rsmod.game.ui.Component
import org.rsmod.map.CoordGrid

public var Player.tutorialProgress: Int by intVarp("varp.tutorial")

// These new Tutorial Island preferences are saved as character attributes rather
// than varps. The standalone Kotlin build does not repack SERVER cache definitions,
// so custom intVarp delegates would fail on existing installations.
private val tutorialFamiliarityAttr: AttributeKey<Int> = AttributeKey("tutorial_familiarity")
private val tutorialQuestAwardedAttr: AttributeKey<Int> = AttributeKey("tutorial_quest_awarded")

/** 0: undecided, 1: newcomer, 2: returning, 3: experienced; permanently saved. */
public var Player.tutorialFamiliarity: Int
    get() = attr[tutorialFamiliarityAttr] ?: 0
    set(value) { attr[tutorialFamiliarityAttr] = value.coerceIn(0, 3) }

/** Quest credit is independent of tutorial completion (Skippy skips the quest reward). */
public var Player.tutorialQuestAwarded: Int
    get() = attr[tutorialQuestAwardedAttr] ?: 0
    set(value) { attr[tutorialQuestAwardedAttr] = value.coerceIn(0, 1) }
private var Player.tutorialProgressBar: Int by intVarp("varp.tutorial_progress_overlay")
private var Player.tutorialFlashingTab: Int by intVarBit("varbit.flashside")
private var Player.newTutorialAccount: Boolean by boolVarBit("varbit.new_player_account")
private var Player.tutorialQuestPoints: Int by intVarp("varp.qp")
private var Player.tutorialQuestsCompleted: Int by intVarBit("varbit.quests_completed_count")

public val Player.tutorialStage: TutorialStage?
    get() = TutorialStage.fromCode(tutorialProgress)

public val Player.onTutorial: Boolean
    get() = tutorialProgress in 1 until TutorialStage.COMPLETE.code

@Singleton
public class TutorialProgress @Inject constructor(
    private val eventBus: EventBus,
    private val npcs: NpcList,
) {
    public fun open(player: Player) {
        player.ifOpenOverlay("interface.tutorial_overlay",
            "component.toplevel_osrs_stretch:overlay_hud", eventBus)
        show(player)
    }

    /** Reopens mandatory character creation if another UI displaced the editor. */
    public fun ensureAppearanceCreation(player: Player) {
        if (player.tutorialAppearancePending &&
            !player.ui.containsModal("interface.makeover_mage") &&
            !player.ui.containsModal("interface.makeover")) {
            player.ifOpenMainModal("interface.makeover_mage", eventBus)
        } else if (player.tutorialFamiliarityPending &&
            !player.ui.containsModal("interface.tutorial_player_experience")) {
            player.ifOpenMainModal("interface.tutorial_player_experience", eventBus)
            player.ifSetEvents("component.tutorial_player_experience:content", 1..3,
                IfEvent.PauseButton)
        }
    }

    public fun advance(player: Player, expected: TutorialStage): Boolean {
        if (!TutorialStage.accepts(player.tutorialStage ?: return false, expected)) return false
        val next = expected.requiredNext
        if (next == TutorialStage.COMPLETE) {
            complete(player)
            return true
        }
        player.tutorialProgress = next.code
        show(player)
        return true
    }

    public fun openLearningRopesJournal(player: Player) {
        if (player.tutorialProgress < TutorialStage.QUEST.code) return
        val lines = journalLines(player)
        player.ifOpenMain("interface.questjournal", eventBus)
        player.runClientScript(5240)
        player.ifSetText("component.questjournal:title", "<col=7f0000>Learning the Ropes</col>")
        for (index in 1..20) {
            player.ifSetText("component.questjournal:qj$index", lines.getOrNull(index - 1) ?: "")
        }
    }

    public fun journalLines(player: Player): List<String> {
        val completed = player.tutorialProgress >= TutorialStage.DEPART.code &&
            (player.tutorialQuestAwarded == 1 || player.tutorialStage == TutorialStage.DEPART)
        val skipped = player.tutorialStage == TutorialStage.COMPLETE &&
            player.tutorialQuestAwarded != 1
        return when {
            skipped -> listOf(
                "You skipped the Tutorial Island lessons.",
                "Learning the Ropes quest credit was not awarded.",
            )
            completed -> listOf(
                "<col=008000>Quest complete!</col>",
                "You finished your training on Tutorial Island.",
                "Rewards: 1 Quest Point and access to the mainland.",
                "Lumbridge Home Teleport is now available.",
            )
            else -> listOf(
            "Talk to the Quest Guide on Tutorial Island.",
            "Learn the basics of Gielinor from its instructors.",
            "Current lesson: ${player.tutorialStage?.lesson ?: "Explore Tutorial Island"}",
            "Next step: ${player.tutorialStage?.objective ?: "Talk to the Quest Guide."}",
            "Cast Wind Strike on a chicken to finish the quest.",
            )
        }
    }

    public fun cookedShrimp(player: Player): Boolean {
        if (player.tutorialStage !in listOf(TutorialStage.COOK_FIRST, TutorialStage.COOK_RETRY)) {
            return false
        }
        player.tutorialProgress = TutorialStage.SURVIVAL_FINISH.code
        show(player)
        return true
    }

    public fun finishWindStrike(player: Player): Boolean {
        if (!advance(player, TutorialStage.CAST)) return false
        player.tutorialQuestPoints++
        player.tutorialQuestsCompleted++
        player.tutorialQuestAwarded = 1
        player.midiJingle(Quest.QUEST_COMPLETE_3_JINGLE)
        player.ifOpenMain("interface.questscroll", eventBus)
        player.ifSetText("component.questscroll:quest_title",
            "You have completed Learning the Ropes!")
        player.ifSetText("component.questscroll:quest_reward1", "1 Quest Point")
        player.ifSetObj("component.questscroll:quest_model", "obj.airrune", 10)
        val rewards = listOf("Access to the mainland", "Lumbridge Home Teleport")
        for (index in 0 until 6) {
            player.ifSetText("component.questscroll:quest_reward${index + 2}",
                rewards.getOrNull(index) ?: "")
        }
        return true
    }

    public fun complete(player: Player) {
        if (player.onTutorial) {
            // Tutorial Island items are temporary. OSRS replaces them with a fixed
            // mainland starter kit, whether the player completes or skips training.
            // Validate every starter item before destroying the tutorial inventory.
            // OSRS cache item IDs are stable; hand-written RSCM aliases such as
            // "obj.bucket" are not. A missing mapping must never strand a player
            // halfway through the departure transaction.
            for (item in STARTER_KIT) {
                check(ServerCacheManager.getItem(item.id) != null) {
                    "Missing Tutorial Island starter item definition: ${item.name} (${item.id})"
                }
            }
            val bank = player.invMap.getOrPut("inv.bank")
            player.inv.fillNulls()
            player.worn.fillNulls()
            bank.fillNulls()
            for (item in STARTER_KIT) {
                check(player.invAdd(player.inv, item.id, item.count).success) {
                    "Unable to grant Tutorial Island starter item: ${item.name} (${item.id})"
                }
            }
            check(player.invAdd(bank, "obj.coins", 25).success) {
                "Unable to grant Tutorial Island starter bank coins."
            }
            // Run energy is restored on arrival on the mainland.
            player.runEnergy = 10000
        }
        player.tutorialProgress = TutorialStage.COMPLETE.code
        player.newTutorialAccount = false
        player.attr.remove(tutorialPassage)
        show(player)
    }

    public fun show(player: Player) {
        val current = player.tutorialStage ?: return
        // Old characters may have logged out at one of the removed mandatory lessons.
        // Move them forward without undoing completed work or requiring a reset.
        val stage = current.resumeStage
        if (player.tutorialProgress != stage.code) player.tutorialProgress = stage.code
        QuestVisibilityScript.refresh(player)
        player.tutorialProgressBar = stage.ordinal * 20 / TutorialStage.COMPLETE.ordinal
        player.tutorialFlashingTab = when (stage) {
            TutorialStage.SETTINGS -> 12
            TutorialStage.INVENTORY -> 4
            TutorialStage.STATS -> 2
            TutorialStage.JOURNAL -> 3
            TutorialStage.EQUIPMENT -> 5
            TutorialStage.ACCOUNT_MANAGEMENT -> 9
            TutorialStage.PRAYER -> 6
            TutorialStage.FRIENDS, TutorialStage.IGNORE -> 10
            TutorialStage.SPELLBOOK -> 7
            else -> 0
        }
        // Instructors move from their map spawn tiles. A coordinate marker remains
        // on the floor (as in the Guide's house), whereas a slot hint follows the
        // live NPC and displays over its head on both the world view and minimap.
        if (player.onTutorial) {
            val npcType = NPC_HINTS[stage]
            val npc = npcType?.let { type ->
                val id = type.asRSCM(RSCMType.NPC)
                npcs.firstOrNull { it.type.id == id && it.isVisible &&
                    it.coords.level == player.coords.level }
            }
            when {
                npc != null -> HintArrows.hintNpc(player, npc)
                npcType != null -> HintArrows.hintStop(player)
                HINT_TARGETS[stage] != null ->
                    HintArrows.hintCoord(player, HINT_TARGETS.getValue(stage))
                else -> HintArrows.hintStop(player)
            }
        } else {
            HintArrows.hintStop(player)
        }
        if (!player.onTutorial) {
            player.ifCloseOverlay("interface.tutorial_overlay", eventBus)
            player.ifCloseOverlay("interface.messagebox_titled", eventBus)
            syncTabs(player, stage)
            player.mes(stage.objective)
            return
        }
        if (player.ui.containsOverlay("interface.tutorial_overlay")) {
            syncTabs(player, stage)
            player.ifCloseOverlay("interface.messagebox_titled", eventBus)
            if (player.tutorialSetupPending) {
                player.ifSetHide("component.tutorial_overlay:hint_layer", true)
            } else if (stage.controlGuide != null) {
                player.runClientScript(2584, stage.controlGuide!!)
            } else {
                val lines = hintLines(stage.objective)
                for (index in 1..4) {
                    player.ifSetText("component.tutorial_overlay:hint_text_$index",
                        lines.getOrNull(index - 2) ?: "")
                }
                player.ifSetHide("component.tutorial_overlay:hint_layer", false)
            }
            player.ifSetHide("component.tutorial_overlay:progressbar_container", false)
            player.runClientScript(867, "component.tutorial_overlay:progressbar".asRSCM())
            if (CHAT_INTERFACES.any { player.ui.containsModal("interface.$it") }) {
                player.ifSetHide("component.tutorial_overlay:hint_layer", true)
            }
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
        public val CHAT_INTERFACES: List<String> =
            listOf("chat_left", "chat_right", "chatmenu", "messagebox", "messagebox_titled", "objectbox")
        /** Instructor targets are NPC slot hints, not stationary spawn tile hints. */
        private val NPC_HINTS: Map<TutorialStage, String> = mapOf(
            TutorialStage.GUIDE to "npc.newbie_basics_instructor",
            TutorialStage.GUIDE_RETURN to "npc.newbie_basics_instructor",
            TutorialStage.SURVIVAL to "npc.newbie_survival_instructor",
            TutorialStage.SURVIVAL_RETURN to "npc.newbie_survival_instructor",
            TutorialStage.SURVIVAL_FINISH to "npc.newbie_survival_instructor",
            TutorialStage.CHEF to "npc.newbie_cook_instructor",
            TutorialStage.QUEST to "npc.newbie_quest_instructor",
            TutorialStage.QUEST_RETURN to "npc.newbie_quest_instructor",
            TutorialStage.MINER to "npc.newbie_mining_instructor",
            TutorialStage.MINER_RETURN to "npc.newbie_mining_instructor",
            TutorialStage.COMBAT to "npc.newbie_combat_instructor",
            TutorialStage.COMBAT_RETURN to "npc.newbie_combat_instructor",
            TutorialStage.ACCOUNT to "npc.newbie_account_instructor",
            TutorialStage.ACCOUNT_RETURN to "npc.newbie_account_instructor",
            TutorialStage.PRIEST to "npc.brother_noob",
            TutorialStage.PRIEST_RETURN to "npc.brother_noob",
            TutorialStage.MAGIC to "npc.newbie_magic_instructor",
            TutorialStage.MAGIC_RETURN to "npc.newbie_magic_instructor",
            TutorialStage.IRONMAN_TUTOR to "npc.ironman_tutor_1",
        )

        /** Fixed-location scenery objectives; instructor targets use NPC_HINTS instead. */
        private val HINT_TARGETS: Map<TutorialStage, CoordGrid> = mapOf(
            TutorialStage.FISH to CoordGrid(3099, 3090),
            TutorialStage.CHOP to CoordGrid(3100, 3098),
            TutorialStage.MINE_TIN to CoordGrid(3075, 9504),
            TutorialStage.MINE_COPPER to CoordGrid(3085, 9501),
            TutorialStage.SMELT to CoordGrid(3078, 9495),
            TutorialStage.EQUIP_DAGGER to CoordGrid(3106, 9509),
            TutorialStage.CAST to CoordGrid(3140, 3093),
        )

        private data class StarterItem(val name: String, val id: Int, val count: Int)

        // OSRS unnoted item IDs, not gameval aliases. All 18 entries are needed
        // for the canonical Tutorial Island mainland inventory.
        private val STARTER_KIT: List<StarterItem> = listOf(
            StarterItem("Bronze axe", 1351, 1),
            StarterItem("Bronze pickaxe", 1265, 1),
            StarterItem("Tinderbox", 590, 1),
            StarterItem("Small fishing net", 303, 1),
            StarterItem("Shrimps", 315, 2),
            StarterItem("Bronze dagger", 1205, 1),
            StarterItem("Bronze sword", 1277, 1),
            StarterItem("Wooden shield", 1171, 1),
            StarterItem("Shortbow", 841, 1),
            StarterItem("Bronze arrows", 882, 25),
            StarterItem("Air runes", 556, 25),
            StarterItem("Mind runes", 558, 15),
            StarterItem("Bucket", 1925, 1),
            StarterItem("Pot", 1931, 1),
            StarterItem("Bread", 2309, 1),
            StarterItem("Water runes", 555, 6),
            StarterItem("Earth runes", 557, 4),
            StarterItem("Body runes", 559, 2),
        )

        public fun canDepartByHomeTeleport(player: Player): Boolean =
            player.tutorialStage == TutorialStage.DEPART && onIsland(player.coords)

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
            Tab(12, "emote", TutorialStage.LEAVE_KITCHEN),
            Tab(13, "music", TutorialStage.LEAVE_KITCHEN),
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
