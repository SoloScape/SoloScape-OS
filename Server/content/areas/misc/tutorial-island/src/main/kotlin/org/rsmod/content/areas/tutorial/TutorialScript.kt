package org.rsmod.content.areas.tutorial

import dev.openrune.definition.type.widget.IfEvent
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import jakarta.inject.Inject
import org.rsmod.api.attr.AttributeKey
import org.rsmod.api.invtx.add
import org.rsmod.api.invtx.delete
import org.rsmod.api.invtx.invAdd
import org.rsmod.api.invtx.invTransaction
import org.rsmod.api.invtx.select
import org.rsmod.api.npc.events.NpcHitEvents
import org.rsmod.api.player.dialogue.Dialogue
import org.rsmod.api.player.events.PlayerHitEvents
import org.rsmod.api.player.events.prayer.PrayerSkillAction
import org.rsmod.api.player.events.skilling.SkillingActionCompleteEvent
import org.rsmod.api.player.events.skilling.SkillingActionContext
import org.rsmod.api.player.events.skilling.SkillingProcessingEvent
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.output.mes
import org.rsmod.api.player.stat.hitpoints
import org.rsmod.api.player.stat.statAdd
import org.rsmod.api.player.ui.ifSetEvents
import org.rsmod.api.script.onCommand
import org.rsmod.api.script.advanced.onIfMoveSub
import org.rsmod.api.script.onEvent
import org.rsmod.api.script.onIfOverlayButton
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpLoc2
import org.rsmod.api.script.onOpLocU
import org.rsmod.api.script.onOpNpc1
import org.rsmod.api.script.onOpNpc2
import org.rsmod.api.script.onOpNpc3
import org.rsmod.api.script.onPlayerHitpointsChanged
import org.rsmod.api.script.onPlayerLogin
import org.rsmod.api.script.onPlayerLogout
import org.rsmod.content.generic.locs.passages.GenericPassageScript
import org.rsmod.content.generic.locs.passages.Passages
import org.rsmod.content.generic.locs.passages.StairNavigator
import org.rsmod.content.interfaces.bank.openBank
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Npc
import org.rsmod.game.entity.Player
import org.rsmod.game.entity.PlayerList
import org.rsmod.game.entity.player.SessionStateEvent
import org.rsmod.game.hit.HitType
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

public data class TutorialPassage(public val stage: TutorialStage, public val destination: CoordGrid)

public val tutorialPassage: AttributeKey<TutorialPassage> = AttributeKey()

public class TutorialScript @Inject constructor(
    private val progress: TutorialProgress,
    private val eventBus: EventBus,
    private val players: PlayerList,
    private val passages: GenericPassageScript,
    private val stairs: StairNavigator,
) : PluginScript() {
    override fun ScriptContext.startup() {
        onEvent<SessionStateEvent.PrepareLogin> {
            if (player.tutorialProgress == 0 &&
                (player.vars["varbit.new_player_account"] == 1 || player.coords == TutorialProgress.START)) {
                val bank = player.invMap.getOrPut("inv.bank")
                val missingCoins = (25 - bank.count("obj.coins")).coerceAtLeast(0)
                if (missingCoins > 0) {
                    check(player.invAdd(bank, "obj.coins", missingCoins).success) {
                        "Unable to provide the new character's 25 starter bank coins."
                    }
                }
                player.coords = TutorialProgress.START
                player.tutorialProgress = TutorialStage.GUIDE.code
            }
        }
        onPlayerLogin {
            if (player.onTutorial) {
                progress.open(player)
                enableTabButtons(player)
            }
        }
        // Popout is moved last, after the HUD, chatbox and side panels are in the new frame.
        onIfMoveSub("component.toplevel_osrs_stretch:popout") {
            if (player.onTutorial) {
                progress.show(player)
                enableTabButtons(player)
            }
        }
        onPlayerLogout { player.attr.remove(tutorialPassage) }
        onCommand("tutorial") {
            desc = "Show the current Tutorial Island instruction"
            cheat {
                if (player.onTutorial) progress.show(player)
                else player.mes("You have already left Tutorial Island.")
            }
        }
        val tutors = mapOf(
            "npc.newbie_basics_instructor" to Tutor.GUIDE,
            "npc.newbie_survival_instructor" to Tutor.SURVIVAL,
            "npc.newbie_cook_instructor" to Tutor.CHEF,
            "npc.newbie_quest_instructor" to Tutor.QUEST,
            "npc.newbie_mining_instructor" to Tutor.MINER,
            "npc.newbie_combat_instructor" to Tutor.COMBAT,
            "npc.newbie_account_instructor" to Tutor.ACCOUNT,
            "npc.brother_noob" to Tutor.PRIEST,
            "npc.newbie_magic_instructor" to Tutor.MAGIC,
        )
        tutors.forEach { (npc, tutor) -> onOpNpc1(npc) { teach(it.npc, tutor) } }

        TOPLEVELS.forEach { frame ->
            TAB_STEPS.forEach { (tab, stage) ->
                onIfOverlayButton("component.$frame:stone$tab") {
                    progress.advance(player, stage)
                }
            }
        }
        onOpNpc1("npc.0_48_48_newbiefishing") { fish(it.npc) }
        listOf("loc.newbietree", "loc.newbietree2", "loc.newbiedeadtree",
            "loc.newbiedeadtree2").forEach { tree ->
            onOpLoc1(tree) { chop(it.loc) }
            onOpLocU(tree, "obj.bronze_axe") { chop(it.loc) }
        }
        onOpLoc1("loc.newbiecopperrock") { mine(it.loc, copper = true) }
        onOpLoc2("loc.newbiecopperrock") { prospect(copper = true) }
        onOpLoc1("loc.newbietinrock") { mine(it.loc, copper = false) }
        onOpLoc2("loc.newbietinrock") { prospect(copper = false) }
        onOpLocU("loc.newbiecopperrock", "obj.bronze_pickaxe") { mine(it.loc, true) }
        onOpLocU("loc.newbietinrock", "obj.bronze_pickaxe") { mine(it.loc, false) }
        onOpLoc1("loc.newbiefurnace") { smelt() }
        onOpLoc2("loc.newbiefurnace") { smelt() }
        onOpLocU("loc.newbiefurnace", "obj.copper_ore") { smelt() }
        onOpLocU("loc.newbiefurnace", "obj.tin_ore") { smelt() }

        onOpLoc1("loc.newbierange") { cookBread() }
        onOpLocU("loc.newbierange", "obj.bread_dough") { cookBread() }
        onOpLocU("loc.newbiefire", "obj.raw_shrimp") { cookTrainingShrimp() }

        onOpLoc1("loc.newbiebankbooth") { openTutorialBank() }
        onOpLoc2("loc.newbiebankbooth") { openTutorialBank() }
        onOpNpc1("npc.noobbanker") { openTutorialBank() }
        onOpNpc2("npc.noobbanker") { openTutorialBank() }
        onOpNpc3("npc.noobbanker") { openTutorialBank() }
        listOf("loc.pollbooth_blue", "loc.pollbooth_blue_standard",
            "loc.pollbooth_blue_highlight", "loc.pollbooth_green",
            "loc.pollbooth_green_standard", "loc.pollbooth_green_highlight").forEach { booth ->
            onOpLoc1(booth) {
                if (player.onTutorial && TutorialProgress.onIsland(coords)) {
                    mesbox("Poll booths explain community voting on proposed game updates. " +
                        "There is no active poll in SoloScape. Close this message and speak to the Account Guide.")
                    progress.advance(player, TutorialStage.POLL)
                } else mesbox("There is no active poll.")
            }
        }

        val doors = mapOf(
            "loc.newbie_door1" to TutorialStage.LEAVE_START,
            "loc.newbiegateclosedl2" to TutorialStage.LEAVE_SURVIVAL,
            "loc.newbiegateclosedr2" to TutorialStage.LEAVE_SURVIVAL,
            "loc.newbie_door2" to TutorialStage.CHEF,
            "loc.newbie_door3" to TutorialStage.LEAVE_KITCHEN,
            "loc.newbie_door4" to TutorialStage.QUEST,
            "loc.newbiedoor4l" to TutorialStage.LEAVE_MINE,
            "loc.newbiedoor4r" to TutorialStage.LEAVE_MINE,
            "loc.newbiedoor5_l" to TutorialStage.MELEE,
            "loc.newbiedoor5_r" to TutorialStage.MELEE,
            "loc.newbie_door6" to TutorialStage.ACCOUNT,
            "loc.newbie_door7" to TutorialStage.LEAVE_BANK,
            "loc.newbie_door8" to TutorialStage.PRIEST,
            "loc.newbie_door9" to TutorialStage.LEAVE_CHURCH,
        )
        doors.forEach { (door, stage) ->
            onOpLoc1(door) {
                val required = if (door == "loc.newbie_door8" &&
                    player.tutorialProgress >= TutorialStage.LEAVE_CHURCH.code)
                    TutorialStage.LEAVE_CHURCH else stage
                cross(it.loc, it.type, required)
            }
        }
        onOpLoc1("loc.newbieladdertop1") { ladder(it.loc, TutorialStage.DESCEND, down = true) }
        onOpLoc1("loc.newbieladder1") { ladder(it.loc, TutorialStage.DESCEND, down = false) }
        onOpLoc1("loc.newbieladder2") { ladder(it.loc, TutorialStage.LEAVE_COMBAT, down = false) }
        onOpLoc1("loc.newbieladdertop2") { ladder(it.loc, TutorialStage.LEAVE_COMBAT, down = true) }

        onEvent<SkillingProcessingEvent> {
            if (!player.onTutorial || !TutorialProgress.onIsland(player.coords)) return@onEvent
            when {
                skill == "stat.firemaking" && input == "obj.logs" ->
                    progress.advance(player, TutorialStage.FIRE)
                input == "obj.raw_shrimp" && output == "obj.burnt_shrimp" ->
                    progress.advance(player, TutorialStage.COOK_FIRST)
                input == "obj.raw_shrimp" && output == "obj.shrimp" ->
                    progress.cookedShrimp(player)
                input == "obj.pot_flour" && output == "obj.bread_dough" ->
                    progress.advance(player, TutorialStage.DOUGH)
                input == "obj.bronze_bar" && output == "obj.bronze_dagger" ->
                    progress.advance(player, TutorialStage.SMITH)
            }
        }
        onEvent<SkillingActionCompleteEvent> {
            val prayer = (context as? SkillingActionContext.Prayer)?.action
            if (prayer is PrayerSkillAction.BuryComplete && prayer.itemInternal == "obj.bones" &&
                TutorialProgress.onIsland(player.coords)) {
                progress.advance(player, TutorialStage.BURY)
            }
        }
        onEvent<NpcHitEvents.AnyImpact> {
            if (!hit.isFromPlayer) return@onEvent
            val player = hit.resolvePlayerSource(players) ?: return@onEvent
            if (!player.onTutorial || !TutorialProgress.onIsland(npc.coords)) return@onEvent
            val name = RSCM.getReverseMapping(RSCMType.NPC, npc.type.id)
            if (name in RATS && hit.damage > 0 && npc.hitpoints <= 0) {
                when (hit.type) {
                    HitType.Melee -> progress.advance(player, TutorialStage.MELEE)
                    HitType.Ranged -> progress.advance(player, TutorialStage.RANGED)
                    else -> Unit
                }
            } else if (name == "npc.newbiechicken" && hit.type == HitType.Magic &&
                hit.damage > 0 &&
                hit.secondaryType()?.id == "obj.01_wind_strike".asRSCM(RSCMType.OBJ) &&
                player.tutorialStage == TutorialStage.CAST) {
                progress.finishWindStrike(player)
            }
        }
        onEvent<PlayerHitEvents.Modify> {
            if (player.onTutorial && TutorialProgress.onIsland(player.coords)) {
                hit.damage = hit.damage.coerceAtMost((player.hitpoints - 1).coerceAtLeast(0))
            }
        }
        onPlayerHitpointsChanged {
            if (player.onTutorial && TutorialProgress.onIsland(player.coords) && player.hitpoints == 0) {
                player.statAdd("stat.hitpoints", constant = 1, percent = 0)
            }
        }
    }

    private fun enableTabButtons(player: Player) {
        val frame = RSCM.getReverseMapping(RSCMType.INTERFACE, player.ui.topLevel.id)
            .removePrefix("interface.")
        if (frame !in TOPLEVELS) return
        // Optional Music and Emotes tabs must stay clickable even though they
        // no longer advance a mandatory tutorial stage.
        for (tab in TAB_STEPS.keys + OPTIONAL_TABS) {
            player.ifSetEvents("component.$frame:stone$tab", -1..0, IfEvent.Op1)
        }
    }

    private suspend fun ProtectedAccess.teach(npc: Npc, tutor: Tutor) {
        startDialogue(npc) {
            if (!player.onTutorial) {
                chatNpc(happy, "You have finished your training. Enjoy your adventures in SoloScape!")
                return@startDialogue
            }
            when (tutor) {
                Tutor.GUIDE -> guide()
                Tutor.SURVIVAL -> survival()
                Tutor.CHEF -> chef()
                Tutor.QUEST -> quest()
                Tutor.MINER -> miner()
                Tutor.COMBAT -> combat()
                Tutor.ACCOUNT -> account()
                Tutor.PRIEST -> priest()
                Tutor.MAGIC -> magic()
            }
        }
    }

    private suspend fun Dialogue.guide() {
        when (player.tutorialStage) {
            TutorialStage.GUIDE -> {
                chatNpc(happy, "Welcome to RuneScape! I will help you learn the controls before " +
                    "the other instructors teach you how to survive and explore.")
                // The original rev-240 cache lacks the October 2025 pre-game three-button
                // familiarity screen. Keep the choice here as an accessible compatibility
                // fallback, but persist it instead of discarding the player's answer.
                if (player.tutorialFamiliarity == 0) {
                    player.tutorialFamiliarity = choice3(
                        "I'm brand new to RuneScape.", 1,
                        "I've played before, but not recently.", 2,
                        "I'm an experienced player.", 3,
                    ).coerceIn(1, 3)
                }
                if (player.tutorialFamiliarity == 1) {
                    chatNpc(happy, "Take your time. The instructions on screen explain your next task.")
                } else {
                    chatNpc(happy, "Welcome back! You'll still practise each lesson before leaving the island.")
                }
                chatNpc(neutral, "Click a nearby tile to walk. Drag the camera with the middle " +
                    "mouse button, or use the arrow keys. On mobile, drag to rotate and tap to walk.")
                chatNpc(neutral, "Open the Settings tab with the spanner button. You can adjust " +
                    "sound and display settings there. Then talk to me again.")
                progress.advance(player, TutorialStage.GUIDE)
            }
            TutorialStage.GUIDE_RETURN -> {
                chatNpc(happy, "Left-click performs the usual action. Right-click shows other " +
                    "options; on mobile, hold your finger down. Click the door and visit the Survival Expert.")
                progress.advance(player, TutorialStage.GUIDE_RETURN)
            }
            else -> reminder()
        }
    }

    private suspend fun Dialogue.survival() {
        when (player.tutorialStage) {
            TutorialStage.SURVIVAL -> {
                chatNpc(happy, "I'm Brynna, your Survival Expert. We will catch food, collect " +
                    "wood, light a fire and cook. Here is a small fishing net.")
                if (!supply("obj.net")) return
                chatNpc(neutral, "Open your inventory, then click a fishing spot in the pond. " +
                    "Your net lets you catch shrimp.")
                progress.advance(player, TutorialStage.SURVIVAL)
            }
            TutorialStage.SURVIVAL_RETURN -> {
                chatNpc(happy, "Catching fish earns Fishing experience. More experience raises " +
                    "your level. Now take this axe and tinderbox, and chop a tree.")
                if (!supply("obj.bronze_axe") || !supply("obj.tinderbox")) return
                progress.advance(player, TutorialStage.SURVIVAL_RETURN)
            }
            TutorialStage.SURVIVAL_FINISH -> {
                chatNpc(happy, "Well done! Eating cooked food restores Hitpoints. Burning food " +
                    "is normal at low levels, so keep practising. Go through the gate to the Master Chef.")
                progress.advance(player, TutorialStage.SURVIVAL_FINISH)
            }
            else -> {
                if (player.tutorialProgress in TutorialStage.INVENTORY.code..TutorialStage.LEAVE_SURVIVAL.code) {
                    supply("obj.net")
                    if (player.tutorialProgress >= TutorialStage.CHOP.code) {
                        supply("obj.bronze_axe")
                        supply("obj.tinderbox")
                    }
                }
                reminder()
            }
        }
    }

    private suspend fun Dialogue.chef() {
        when (player.tutorialStage) {
            TutorialStage.CHEF -> {
                chatNpc(happy, "Ah, another hungry adventurer! I'm Lev, the Master Chef. " +
                    "Brynna's campfire shrimp are a start, but this is a proper kitchen!")
                chatNpc(happy, "Let's see you bake something fit for a king. I'll give you " +
                    "flour and water; combine them into dough and bake it on the range.")
                if (!supply("obj.pot_flour") || !supply("obj.bucket_water")) return
                progress.advance(player, TutorialStage.CHEF)
            }
            TutorialStage.DOUGH, TutorialStage.BREAD -> {
                if (!access.inv.contains("obj.bread_dough")) {
                    supply("obj.pot_flour")
                    supply("obj.bucket_water")
                }
                if (player.tutorialStage == TutorialStage.DOUGH) {
                    chatNpc(neutral, "A good loaf begins with dough. Use your pot of flour " +
                        "on the bucket of water, or the other way around.")
                } else {
                    chatNpc(happy, "Splendid, you've made the dough! Now use it on the range. " +
                        "A proper oven makes all the difference.")
                }
            }
            else -> {
                if (player.tutorialProgress < TutorialStage.CHEF.code) {
                    reminder()
                    return
                }
                if (player.tutorialStage == TutorialStage.LEAVE_KITCHEN) {
                    chatNpc(neutral, "Your bread is ready. You can try the Music or Emotes " +
                        "tab, and turn on running with the run orb, if you like. " +
                        "None is required; follow the path to the Quest Guide when ready.")
                }
                chatNpc(happy, "Welcome back to my kitchen! Need another cooking lesson?")
                when (choice3("No thanks, Chef.", 1,
                    "Remind me how to make dough.", 2,
                    "Why should I use a range?", 3)) {
                    2 -> chatNpc(neutral, "Combine a pot of flour and a bucket of water " +
                        "in your inventory. You can refill a bucket at a water source.")
                    3 -> chatNpc(happy, "Ranges are better suited to bread and more " +
                        "elaborate dishes than an open fire. Bring the ingredients along.")
                    else -> chatNpc(happy, "Very well! Keep practising, and perhaps " +
                        "you'll cook a royal banquet one day.")
                }
            }
        }
    }

    private suspend fun Dialogue.quest() {
        when (player.tutorialStage) {
            TutorialStage.QUEST -> {
                chatNpc(happy, "Ah, a budding adventurer! I'm the Quest Guide. " +
                    "There's more to Gielinor than gathering supplies and fighting rats.")
                chatNpc(neutral, "Some quests ask you to find a few curious items; others " +
                    "send you against dragons. Open your Quest Journal to begin.")
                progress.advance(player, TutorialStage.QUEST)
            }
            TutorialStage.JOURNAL -> {
                chatNpc(neutral, "Haven't found the Quest Journal yet? Open the quest " +
                    "tab on the side of the screen, then come back and see me.")
            }
            TutorialStage.QUEST_RETURN -> {
                questOverview()
                chatNpc(happy, "The best tales are the ones you discover yourself. " +
                    "Head down the ladder and meet the Mining Instructor.")
                progress.advance(player, TutorialStage.QUEST_RETURN)
            }
            else -> {
                if (player.tutorialProgress < TutorialStage.QUEST.code) {
                    reminder()
                    return
                }
                chatNpc(happy, "Still curious about quests, adventurer?")
                if (choice2("No, I'll explore for myself.", 1,
                    "Tell me about quests again.", 2) == 2) {
                    questOverview()
                } else {
                    chatNpc(happy, "Excellent! There are stories waiting beyond this island.")
                }
            }
        }
    }

    private suspend fun Dialogue.questOverview() {
        chatNpc(neutral, "Look for quest symbols on the minimap. Your Quest Journal " +
            "shows where to start a quest, what you need, and your next steps.")
        chatNpc(neutral, "Red entries have not been started, yellow entries are underway, " +
            "and green entries are finished.")
        chatNpc(happy, "Adventures can earn experience, equipment and access to new places. " +
            "A simple errand might be the beginning of something much greater!")
    }

    private suspend fun Dialogue.miner() {
        when (player.tutorialStage) {
            TutorialStage.MINER -> {
                chatNpc(happy, "Welcome to my mine! I'm Dezzick. Stone and metal are " +
                    "the foundations of a good adventurer's equipment.")
                chatNpc(neutral, "Take this pickaxe and mine one tin ore from a grey rock " +
                    "and one copper ore from a brown rock. You can also prospect " +
                    "rocks to identify them, but that isn't required.")
                if (!supply("obj.bronze_pickaxe")) return
                progress.advance(player, TutorialStage.MINER)
            }
            TutorialStage.MINER_RETURN -> {
                chatNpc(happy, "Nice work! One copper ore and one tin ore make a bronze " +
                    "bar in the furnace. Now let's put that metal to use.")
                chatNpc(neutral, "Here's a hammer. Use your bronze bar on the anvil " +
                    "and select a dagger from the smithing options.")
                if (!supply("obj.hammer")) return
                progress.advance(player, TutorialStage.MINER_RETURN)
            }
            else -> {
                if (player.tutorialProgress < TutorialStage.MINER.code) {
                    reminder()
                    return
                }
                if (player.tutorialProgress in
                    TutorialStage.PROSPECT_TIN.code..TutorialStage.SMITH.code) {
                    supply("obj.bronze_pickaxe")
                    if (player.tutorialStage == TutorialStage.SMITH) supply("obj.hammer")
                }
                chatNpc(neutral, "Need a pointer? There's plenty of ore, but " +
                    "you'll need to learn what to do with it.")
                when (choice3("No, I'll get to work.", 1,
                    "Remind me about Mining.", 2,
                    "Remind me about Smithing.", 3)) {
                    2 -> chatNpc(neutral, "Inspect rocks to identify their ore, then " +
                        "mine them with a pickaxe. Grey holds tin; brown holds copper here.")
                    3 -> chatNpc(happy, "Smelt tin and copper together at the furnace. " +
                        "Use the bronze bar on an anvil with a hammer to make a dagger.")
                    else -> chatNpc(happy, "That's the spirit! Every great sword " +
                        "began with someone swinging a pickaxe.")
                }
                if (player.tutorialProgress <= TutorialStage.SMITH.code) reminder()
            }
        }
    }

    private suspend fun Dialogue.combat() {
        when (player.tutorialStage) {
            TutorialStage.COMBAT -> {
                chatNpc(neutral, "So, another newcomer thinks they're ready to fight? " +
                    "I'm Vannaka, and I've handled swords longer than you've held that dagger.")
                chatNpc(happy, "A weapon is only useful when you wield it. Open the " +
                    "Worn Equipment tab and equip your bronze dagger.")
                if (!supply("obj.bronze_dagger")) return
                progress.advance(player, TutorialStage.COMBAT)
            }
            TutorialStage.EQUIP_DAGGER -> {
                if (!player.worn.contains("obj.bronze_dagger")) {
                    supply("obj.bronze_dagger")
                    chatNpc(neutral, "That dagger won't fight from inside your pack. " +
                        "Equip it and then we'll see what you can do.")
                    return
                }
                chatNpc(happy, "Good! Now you look more like a fighter. Take this " +
                    "bronze sword and shield, and equip both before facing a rat.")
                if (!supply("obj.bronze_sword") || !supply("obj.wooden_shield")) return
                progress.advance(player, TutorialStage.EQUIP_DAGGER)
            }
            TutorialStage.COMBAT_RETURN -> {
                chatNpc(happy, "Not bad, recruit! You survived your first melee fight. " +
                    "Attack, Strength and Defence improve different parts of your fighting.")
                chatNpc(neutral, "Now show me you can strike from a distance. " +
                    "Take this shortbow and fifty bronze arrows.")
                if (!supply("obj.shortbow") || !supply("obj.bronze_arrow", 50)) return
                chatNpc(neutral, "Equip the bow and arrows, then shoot a giant rat " +
                    "from outside the pen. You don't need to stand beside your target.")
                progress.advance(player, TutorialStage.COMBAT_RETURN)
            }
            else -> {
                if (player.tutorialProgress < TutorialStage.COMBAT.code) {
                    reminder()
                    return
                }
                when (player.tutorialStage) {
                    TutorialStage.EQUIP_SWORD, TutorialStage.MELEE -> {
                        supply("obj.bronze_sword")
                        supply("obj.wooden_shield")
                    }
                    TutorialStage.RANGED -> {
                        supply("obj.shortbow")
                        supply("obj.bronze_arrow", 50)
                    }
                    else -> Unit
                }
                if (player.tutorialProgress in
                    TutorialStage.EQUIP_DAGGER.code..TutorialStage.RANGED.code) {
                    supply("obj.shrimp", 3)
                }
                chatNpc(neutral, "Back for more instruction? A fighter ought to " +
                    "understand both close combat and ranged attacks.")
                when (choice3("I'm ready to carry on.", 1,
                    "Explain melee combat again.", 2,
                    "Explain Ranged combat again.", 3)) {
                    2 -> chatNpc(neutral, "Combat styles can train Attack, Strength or " +
                        "Defence. Open the Combat tab to choose a style for your weapon.")
                    3 -> chatNpc(neutral, "Equip a bow and arrows to fight at a distance. " +
                        "You can shoot from outside a pen without stepping into it.")
                    else -> chatNpc(happy, "Then put that training to good use, recruit!")
                }
                if (player.tutorialProgress <= TutorialStage.RANGED.code) reminder()
            }
        }
    }

    private suspend fun Dialogue.account() {
        when (player.tutorialStage) {
            TutorialStage.ACCOUNT -> {
                chatNpc(happy, "I'm the Account Guide. Your character belongs to an account, " +
                    "and account settings help you look after it.")
                chatNpc(neutral, "Open the Account Management tab using the account icon on " +
                    "the side of the screen. Come back to me once you've found it.")
                progress.advance(player, TutorialStage.ACCOUNT)
            }
            TutorialStage.ACCOUNT_MANAGEMENT -> {
                chatNpc(neutral, "Find the Account Management tab on the side of the game " +
                    "screen and open it. Then speak to me again.")
            }
            TutorialStage.ACCOUNT_RETURN -> {
                accountOverview()
                val bank = access.bank
                val missingCoins = (25 - bank.count("obj.coins")).coerceAtLeast(0)
                if (missingCoins > 0 && !access.invAdd(bank, "obj.coins", missingCoins).success) {
                    chatNpc(neutral, "Your bank is full. Make room and come back for your starter coins.")
                    return
                }
                chatNpc(happy, "Your 25 starter coins are in your bank. That covers the basics! " +
                    "Follow the path to the church and meet Brother Brace.")
                progress.advance(player, TutorialStage.ACCOUNT_RETURN)
            }
            else -> {
                if (player.tutorialProgress < TutorialStage.ACCOUNT.code) {
                    reminder()
                    return
                }
                chatNpc(happy, "Hello again! Would you like a recap of Account Management?")
                if (choice2("Yes, please.", 1, "No thanks.", 2) == 1) {
                    accountOverview()
                } else {
                    chatNpc(happy, "No problem. Enjoy your adventures!")
                }
            }
        }
    }

    private suspend fun Dialogue.accountOverview() {
        chatNpc(neutral, "In official Old School RuneScape, Account Management covers " +
            "membership, Bonds, account messages, display names and useful links.")
        chatNpc(neutral, "Worlds are different game servers. In OSRS, the Logout tab has " +
            "a World Switcher, and some worlds need membership to enter.")
        chatNpc(neutral, "Membership unlocks extra skills, areas and quests in OSRS. " +
            "Bonds can be redeemed for membership or traded between players.")
        chatNpc(neutral, "SoloScape does not currently offer OSRS membership or Bond " +
            "purchases through its Account tab, so those store options may be unavailable.")
        chatNpc(neutral, "OSRS also provides an account inbox, a display-name changer " +
            "and support links. SoloScape may manage these differently or outside the client.")
        chatNpc(neutral, "Keep your password private and use additional authentication " +
            "when available. A bank PIN protects bank items in OSRS; never share a PIN.")
    }

    private suspend fun Dialogue.priest() {
        when (player.tutorialStage) {
            TutorialStage.PRIEST -> {
                chatNpc(happy, "Peace be with you, traveller. I'm Brother Brace, " +
                    "and I'll teach you about Prayer.")
                chatNpc(neutral, "Prayers aid you in battle, but they use Prayer points. " +
                    "Open the Prayer tab to see the ones you can use.")
                if (!supply("obj.bones")) return
                progress.advance(player, TutorialStage.PRIEST)
            }
            TutorialStage.PRAYER -> {
                chatNpc(neutral, "Open the Prayer tab to view your prayers. " +
                    "A prayer is switched on by clicking it and off by clicking again.")
            }
            TutorialStage.BURY -> {
                supply("obj.bones")
                chatNpc(happy, "To gain Prayer experience, bury bones from your backpack. " +
                    "Altars restore Prayer points when they've run low.")
            }
            TutorialStage.PRIEST_RETURN -> {
                chatNpc(happy, "Well done! Prayer is a comfort on dangerous journeys. " +
                    "Remember to restore your Prayer points at an altar.")
                socialOverview()
                chatNpc(neutral, "Please treat fellow adventurers kindly and use " +
                    "the Report option for abusive behaviour.")
                chatNpc(happy, "Now follow the path to your final instructor, Terrova.")
                progress.advance(player, TutorialStage.PRIEST_RETURN)
            }
            else -> {
                if (player.tutorialProgress < TutorialStage.PRIEST.code) {
                    reminder()
                    return
                }
                chatNpc(happy, "Welcome back, my child. What can I explain?")
                when (choice3("No thanks, brother.", 1,
                    "Tell me about Prayer again.", 2,
                    "Tell me about Friends and Ignore.", 3)) {
                    2 -> prayerOverview()
                    3 -> socialOverview()
                    else -> chatNpc(happy, "Go in peace, and treat others as " +
                        "you would wish to be treated.")
                }
                if (player.tutorialProgress < TutorialStage.LEAVE_CHURCH.code) reminder()
            }
        }
    }

    private suspend fun Dialogue.prayerOverview() {
        chatNpc(neutral, "Click a prayer to turn it on or off. Higher Prayer " +
            "levels unlock stronger effects, but active prayers drain points.")
        chatNpc(neutral, "Pray at an altar to restore your Prayer points, " +
            "and bury bones to gain Prayer experience.")
    }

    private suspend fun Dialogue.socialOverview() {
        chatNpc(neutral, "Your Friends list helps you see when friends are online. " +
            "You can add or remove names through the social controls.")
        chatNpc(neutral, "The Ignore list helps block unwanted contact. " +
            "Use it if someone is bothering you; you can also report abuse.")
    }

    private suspend fun Dialogue.magic() {
        when (player.tutorialStage) {
            TutorialStage.MAGIC -> {
                chatNpc(happy, "I'm Terrova. Magic can damage enemies, teleport you and create " +
                    "useful effects. Open your Magic tab to see your spellbook.")
                progress.advance(player, TutorialStage.MAGIC)
            }
            TutorialStage.MAGIC_RETURN -> {
                chatNpc(neutral, "Each spell needs a Magic level and particular runes. Wind " +
                    "Strike uses one air rune and one mind rune. Take these runes and cast it on a chicken.")
                if (!supply("obj.airrune", 5) || !supply("obj.mindrune", 5)) return
                progress.advance(player, TutorialStage.MAGIC_RETURN)
            }
            TutorialStage.CAST -> {
                supply("obj.airrune", 5)
                supply("obj.mindrune", 5)
                chatNpc(neutral, "Click Wind Strike in your spellbook, then click a chicken " +
                    "inside the pen. If a spell misses, try again. You can cast without a staff.")
            }
            TutorialStage.DEPART -> {
                chatNpc(happy, "Congratulations! You have completed Learning the Ropes. " +
                    "Your final lesson is the Lumbridge Home Teleport spell.")
                chatNpc(neutral, "Open your Magic tab and select Lumbridge Home Teleport. " +
                    "It needs no runes and will take you to the mainland.")
                when (choice2("I'd like to be an Ironman.", 1,
                    "I'm ready to cast Home Teleport.", 2)) {
                    1 -> chatNpc(neutral, "Speak to the Ironman tutor outside my building " +
                        "before you leave. You can come back here once you've chosen your mode.")
                    else -> chatNpc(happy, "Cast Lumbridge Home Teleport from your spellbook " +
                        "when you are ready. You can remain on the island until then.")
                }
            }
            else -> reminder()
        }
    }

    private suspend fun Dialogue.reminder() {
        chatNpc(neutral, "Your next objective is shown in the tutorial guide. " +
            "Follow it to continue, or ask me again if you need supplies.")
    }

    private suspend fun Dialogue.supply(item: String, count: Int = 1): Boolean {
        val owned = access.inv.count(item) + player.worn.count(item) + access.bank.count(item)
        if (owned >= count) return true
        val result = access.invAdd(access.inv, item, count - owned)
        if (!result.success) {
            chatNpc(neutral, "Your inventory is full. Make some room and speak to me again.")
            return false
        }
        return true
    }

    private fun ProtectedAccess.lessonAtLeast(stage: TutorialStage): Boolean {
        if (!player.onTutorial || player.tutorialProgress < stage.code) {
            progress.show(player)
            return false
        }
        return TutorialProgress.onIsland(coords)
    }

    private suspend fun ProtectedAccess.fish(npc: Npc) {
        if (!lessonAtLeast(TutorialStage.FISH)) return
        if (!inv.contains("obj.net")) {
            mes("Ask the Survival Expert for a fishing net.")
            return
        }
        faceSquare(npc.coords)
        anim("seq.human_smallnet")
        delay(3)
        resetAnim()
        if (!invAdd(inv, "obj.raw_shrimp", 1).success) {
            mes("You need space in your inventory for a shrimp.")
            return
        }
        statAdvance("stat.fishing", 10.0, rate = 1.0, globalRate = 1.0)
        mes("You catch a shrimp.")
        progress.advance(player, TutorialStage.FISH)
    }

    private suspend fun ProtectedAccess.chop(loc: BoundLocInfo) {
        if (!lessonAtLeast(TutorialStage.CHOP)) return
        if (!inv.contains("obj.bronze_axe") && !player.worn.contains("obj.bronze_axe")) {
            mes("Ask the Survival Expert for a bronze axe.")
            return
        }
        faceSquare(loc.coords)
        anim("seq.human_woodcutting_bronze_axe")
        delay(3)
        resetAnim()
        if (!invAdd(inv, "obj.logs", 1).success) {
            mes("You need space in your inventory for logs.")
            return
        }
        statAdvance("stat.woodcutting", 25.0, rate = 1.0, globalRate = 1.0)
        mes("You get some logs.")
        progress.advance(player, TutorialStage.CHOP)
    }

    private suspend fun ProtectedAccess.prospect(copper: Boolean) {
        if (!lessonAtLeast(TutorialStage.MINE_TIN)) return
        mesbox("This rock contains ${if (copper) "copper" else "tin"} ore.")
        // Prospecting is optional. Only a successful ore collection advances the lesson.
    }

    private suspend fun ProtectedAccess.mine(loc: BoundLocInfo, copper: Boolean) {
        if (!lessonAtLeast(TutorialStage.MINE_TIN)) return
        if (!inv.contains("obj.bronze_pickaxe") && !player.worn.contains("obj.bronze_pickaxe")) {
            mes("Ask the Mining Instructor for a pickaxe.")
            return
        }
        faceSquare(loc.coords)
        anim("seq.human_mining_bronze_pickaxe")
        delay(3)
        resetAnim()
        val ore = if (copper) "obj.copper_ore" else "obj.tin_ore"
        if (!invAdd(inv, ore, 1).success) {
            mes("You need space in your inventory for ore.")
            return
        }
        statAdvance("stat.mining", 17.5, rate = 1.0, globalRate = 1.0)
        mes("You mine some ${if (copper) "copper" else "tin"} ore.")
        progress.advance(player, if (copper) TutorialStage.MINE_COPPER else TutorialStage.MINE_TIN)
    }

    private suspend fun ProtectedAccess.smelt() {
        if (!lessonAtLeast(TutorialStage.SMELT)) return
        if (!inv.contains("obj.copper_ore") || !inv.contains("obj.tin_ore")) {
            mes("Mine one copper ore and one tin ore before using the furnace.")
            return
        }
        anim("seq.human_furnace")
        delay(3)
        resetAnim()
        if (!convert(listOf("obj.copper_ore", "obj.tin_ore"), "obj.bronze_bar")) return
        statAdvance("stat.smithing", 6.2, rate = 1.0, globalRate = 1.0)
        mes("You smelt a bronze bar.")
        progress.advance(player, TutorialStage.SMELT)
    }

    private suspend fun ProtectedAccess.cookBread() {
        if (!lessonAtLeast(TutorialStage.BREAD)) return
        if (!inv.contains("obj.bread_dough")) {
            mes("Mix a pot of flour and a bucket of water to make bread dough first.")
            return
        }
        anim("seq.human_cooking")
        delay(3)
        resetAnim()
        if (!convert(listOf("obj.bread_dough"), "obj.bread")) return
        statAdvance("stat.cooking", 40.0, rate = 1.0, globalRate = 1.0)
        mes("You bake a loaf of bread.")
        progress.advance(player, TutorialStage.BREAD)
    }

    private suspend fun ProtectedAccess.cookTrainingShrimp() {
        if (!lessonAtLeast(TutorialStage.COOK_FIRST)) return
        if (!inv.contains("obj.raw_shrimp")) return
        anim("seq.human_cooking")
        delay(3)
        resetAnim()
        if (!convert(listOf("obj.raw_shrimp"), "obj.shrimp")) return
        statAdvance("stat.cooking", 30.0, rate = 1.0, globalRate = 1.0)
        mes("You successfully cook the shrimp.")
        progress.cookedShrimp(player)
    }

    private fun ProtectedAccess.convert(inputs: List<String>, output: String): Boolean {
        val result = player.invTransaction(inv) {
            val target = select(inv)
            inputs.forEach { delete(target, it.asRSCM(RSCMType.OBJ), 1) }
            add(target, output.asRSCM(RSCMType.OBJ), 1)
        }
        if (!result.success) mes("You need the ingredients and space for the result.")
        return result.success
    }

    private suspend fun ProtectedAccess.cross(loc: BoundLocInfo, type: ObjectServerType,
        required: TutorialStage) {
        if (!lessonAtLeast(required)) return
        if (required == TutorialStage.MELEE && player.tutorialStage == TutorialStage.RANGED) {
            mes("Stay outside the pen and use your bow to shoot over the fence.")
            return
        }
        val dest = Passages.tileAcross(loc, coords) ?: return
        val advances = required in PASSAGE_STEPS
        if (advances && player.tutorialStage == required) {
            player.attr[tutorialPassage] = TutorialPassage(required, dest)
        }
        with(passages) { walkThrough(loc, type) }
    }

    private suspend fun ProtectedAccess.ladder(loc: BoundLocInfo, required: TutorialStage,
        down: Boolean) {
        if (!lessonAtLeast(required)) return
        val dest = stairs.destination(loc, coords, up = !down) ?: run {
            mes("There is no safe landing beside the ladder.")
            return
        }
        telejump(dest, TeleportType.Exempt)
        if (coords == dest) progress.advance(player, required)
    }

    private fun ProtectedAccess.openTutorialBank() {
        if (!lessonAtLeast(TutorialStage.BANK)) return
        if (player.openBank(eventBus)) progress.advance(player, TutorialStage.BANK)
        else if (player.tutorialStage == TutorialStage.BANK) {
            mes("Ultimate Ironman characters cannot use banks. Your mode keeps your items with you.")
            progress.advance(player, TutorialStage.BANK)
        }
    }

    private enum class Tutor { GUIDE, SURVIVAL, CHEF, QUEST, MINER, COMBAT, ACCOUNT, PRIEST, MAGIC }

    private companion object {
        val TOPLEVELS = listOf("toplevel_osrs_stretch", "toplevel_pre_eoc", "toplevel", "toplevel_osm")
        val OPTIONAL_TABS = listOf(12, 13)
        val TAB_STEPS = mapOf(11 to TutorialStage.SETTINGS, 3 to TutorialStage.INVENTORY,
            1 to TutorialStage.STATS,
            2 to TutorialStage.JOURNAL, 4 to TutorialStage.EQUIPMENT,
            5 to TutorialStage.PRAYER, 9 to TutorialStage.FRIENDS, 6 to TutorialStage.SPELLBOOK,
            8 to TutorialStage.ACCOUNT_MANAGEMENT)
        val RATS = setOf("npc.newbiegiantrat", "npc.newbiegiantrat2", "npc.newbiegiantrat3")
        val PASSAGE_STEPS = setOf(TutorialStage.LEAVE_START, TutorialStage.LEAVE_SURVIVAL,
            TutorialStage.LEAVE_KITCHEN, TutorialStage.LEAVE_MINE, TutorialStage.LEAVE_BANK,
            TutorialStage.LEAVE_CHURCH)
    }
}
