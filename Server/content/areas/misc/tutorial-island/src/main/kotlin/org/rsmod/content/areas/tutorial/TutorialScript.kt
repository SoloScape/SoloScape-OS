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
import org.rsmod.content.interfaces.emotes.PlayEmote
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
        onEvent<PlayEmote> {
            if (TutorialProgress.onIsland(player.coords)) progress.advance(player, TutorialStage.EMOTES)
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
        for (tab in TAB_STEPS.keys) {
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
                when (choice3("I'm new to this.", 1, "I've played before.", 2,
                    "I know my way around.", 3)) {
                    1 -> chatNpc(happy, "Take your time. The instructions on screen explain your next task.")
                    else -> chatNpc(happy, "You will still practise each lesson before leaving the island.")
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
                chatNpc(happy, "Welcome to my kitchen! Let's bake bread. Take this pot of " +
                    "flour and bucket of water. Mix them to make bread dough, then use the range.")
                if (!supply("obj.pot_flour") || !supply("obj.bucket_water")) return
                progress.advance(player, TutorialStage.CHEF)
            }
            TutorialStage.DOUGH, TutorialStage.BREAD -> {
                if (!access.inv.contains("obj.bread_dough")) {
                    supply("obj.pot_flour")
                    supply("obj.bucket_water")
                }
                reminder()
            }
            else -> {
                chatNpc(happy, "The Music tab controls the music you unlock while exploring. " +
                    "Emotes let you express yourself. Running moves you faster but uses energy.")
                reminder()
            }
        }
    }

    private suspend fun Dialogue.quest() {
        when (player.tutorialStage) {
            TutorialStage.QUEST -> {
                chatNpc(happy, "Adventurers help people by completing quests. Open the Quest " +
                    "Journal to see the quests available to you.")
                progress.advance(player, TutorialStage.QUEST)
            }
            TutorialStage.QUEST_RETURN -> {
                chatNpc(neutral, "Quest entries describe requirements and track your progress. " +
                    "Red means not started, yellow means in progress and green means complete.")
                chatNpc(happy, "Quest rewards include experience, items and new places to visit. " +
                    "Climb down the ladder to meet the Mining Instructor.")
                progress.advance(player, TutorialStage.QUEST_RETURN)
            }
            else -> reminder()
        }
    }

    private suspend fun Dialogue.miner() {
        when (player.tutorialStage) {
            TutorialStage.MINER -> {
                chatNpc(happy, "I'm Dezzick. Mining gives you ore; Smithing turns it into metal " +
                    "equipment. Take this pickaxe and prospect the tin and copper rocks.")
                if (!supply("obj.bronze_pickaxe")) return
                progress.advance(player, TutorialStage.MINER)
            }
            TutorialStage.MINER_RETURN -> {
                chatNpc(happy, "Copper and tin make bronze. Take this hammer, then use your " +
                    "bronze bar on the nearby anvil to smith a dagger.")
                if (!supply("obj.hammer")) return
                progress.advance(player, TutorialStage.MINER_RETURN)
            }
            else -> {
                if (player.tutorialProgress in TutorialStage.PROSPECT_TIN.code..TutorialStage.LEAVE_MINE.code) {
                    supply("obj.bronze_pickaxe")
                    if (player.tutorialStage == TutorialStage.SMITH) supply("obj.hammer")
                }
                reminder()
            }
        }
    }

    private suspend fun Dialogue.combat() {
        when (player.tutorialStage) {
            TutorialStage.COMBAT -> {
                chatNpc(happy, "I'm Vannaka. Your equipment changes how you fight. Open the " +
                    "Worn Equipment tab, then wield the bronze dagger you made.")
                if (!supply("obj.bronze_dagger")) return
                progress.advance(player, TutorialStage.COMBAT)
            }
            TutorialStage.EQUIP_DAGGER -> {
                if (!player.worn.contains("obj.bronze_dagger")) {
                    supply("obj.bronze_dagger")
                    reminder()
                    return
                }
                chatNpc(happy, "Good. A sword gives you another melee weapon, and a shield " +
                    "helps defend you. Equip both, then enter the pen and attack a giant rat.")
                if (!supply("obj.bronze_sword") || !supply("obj.wooden_shield")) return
                progress.advance(player, TutorialStage.EQUIP_DAGGER)
            }
            TutorialStage.COMBAT_RETURN -> {
                chatNpc(happy, "You defeated the rat! Melee uses Attack, Strength and Defence. " +
                    "Choose your fighting style in the Combat tab. Next, try Ranged.")
                if (!supply("obj.shortbow") || !supply("obj.bronze_arrow", 50)) return
                chatNpc(neutral, "Wield the shortbow and equip your arrows. Stand outside the " +
                    "pen and shoot a giant rat over the fence. Bows need both a weapon and ammunition.")
                progress.advance(player, TutorialStage.COMBAT_RETURN)
            }
            else -> {
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
                if (player.tutorialProgress in TutorialStage.EQUIP_DAGGER.code..TutorialStage.RANGED.code)
                    supply("obj.shrimp", 3)
                reminder()
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
                chatNpc(happy, "Welcome. I'm Brother Brace. Prayer offers useful temporary " +
                    "bonuses, but active prayers drain Prayer points. Burying bones earns experience " +
                    "to unlock more prayers. Open the Prayer tab to see them.")
                if (!supply("obj.bones")) return
                progress.advance(player, TutorialStage.PRIEST)
            }
            TutorialStage.BURY -> {
                supply("obj.bones")
                chatNpc(neutral, "Prayers drain Prayer points while active. Higher Prayer " +
                    "levels unlock more prayers. Bury these bones to earn Prayer experience.")
                reminder()
            }
            TutorialStage.PRIEST_RETURN -> {
                chatNpc(happy, "The Friends list helps you find people you know and send " +
                    "private messages. The Ignore list hides messages from people you do not wish to hear.")
                chatNpc(neutral, "Be respectful, keep personal details private and use Report " +
                    "for abuse. You don't need to add a stranger to finish this lesson.")
                chatNpc(happy, "Leave through the church door. The Magic Instructor " +
                    "will teach your final lesson.")
                progress.advance(player, TutorialStage.PRIEST_RETURN)
            }
            else -> reminder()
        }
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
        chatNpc(neutral, player.tutorialStage?.instruction ?: "Please follow your tutorial instructions.")
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
        if (!lessonAtLeast(TutorialStage.PROSPECT_TIN)) return
        mesbox("This rock contains ${if (copper) "copper" else "tin"} ore.")
        progress.advance(player, if (copper) TutorialStage.PROSPECT_COPPER else TutorialStage.PROSPECT_TIN)
    }

    private suspend fun ProtectedAccess.mine(loc: BoundLocInfo, copper: Boolean) {
        if ((player.tutorialStage == TutorialStage.PROSPECT_TIN && !copper) ||
            (player.tutorialStage == TutorialStage.PROSPECT_COPPER && copper)) {
            prospect(copper)
            return
        }
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
            mes("Mix a pot of flour and a jug of water to make bread dough first.")
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
        val TAB_STEPS = mapOf(11 to TutorialStage.SETTINGS, 3 to TutorialStage.INVENTORY,
            1 to TutorialStage.STATS, 13 to TutorialStage.MUSIC,
            2 to TutorialStage.JOURNAL, 4 to TutorialStage.EQUIPMENT,
            5 to TutorialStage.PRAYER, 9 to TutorialStage.FRIENDS, 6 to TutorialStage.SPELLBOOK,
            8 to TutorialStage.ACCOUNT_MANAGEMENT)
        val RATS = setOf("npc.newbiegiantrat", "npc.newbiegiantrat2", "npc.newbiegiantrat3")
        val PASSAGE_STEPS = setOf(TutorialStage.LEAVE_START, TutorialStage.LEAVE_SURVIVAL,
            TutorialStage.LEAVE_KITCHEN, TutorialStage.LEAVE_MINE, TutorialStage.LEAVE_BANK,
            TutorialStage.LEAVE_CHURCH)
    }
}
