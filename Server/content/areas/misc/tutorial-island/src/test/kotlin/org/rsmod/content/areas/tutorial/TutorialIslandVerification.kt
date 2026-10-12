@file:OptIn(org.rsmod.annotations.InternalApi::class)

package org.rsmod.content.areas.tutorial

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.types.InventoryServerType
import dev.or2.central.account.AccountData
import dev.or2.central.account.CharacterData
import dev.or2.central.account.Rights
import java.time.LocalDateTime
import org.rsmod.api.account.loader.request.AccountLoadAuth
import org.rsmod.api.account.loader.request.AccountLoadResponse
import org.rsmod.api.account.loader.request.isNewAccount
import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine
import org.rsmod.api.area.checker.AreaChecker
import org.rsmod.api.game.process.player.PlayerFaceSquareProcessor
import org.rsmod.api.inv.storage.PlayerItemStorage
import org.rsmod.api.invtx.InvTransactionsScript
import org.rsmod.api.player.dialogue.align.TextAlignment
import org.rsmod.api.player.events.interact.NpcEvents
import org.rsmod.api.player.events.interact.LocEvents
import org.rsmod.api.npc.events.NpcHitEvents
import org.rsmod.api.player.events.PlayerHitpointsChangedEvent
import org.rsmod.api.player.events.skilling.SkillingProcessingEvent
import org.rsmod.api.player.hook.PlayerTeleportValidator
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.api.player.input.ResumePauseButtonInput
import org.rsmod.api.player.interact.LocInteractions
import org.rsmod.api.player.interact.NpcInteractions
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.protect.ProtectedAccessContextFactory
import org.rsmod.api.player.stat.TutorialExperience
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.api.player.ui.IfOverlayButton
import org.rsmod.api.player.ui.IfMoveSub
import org.rsmod.api.player.ui.ifOpenOverlay
import org.rsmod.api.player.ui.ifOpenSub
import org.rsmod.api.player.ui.ifCloseChat
import dev.openrune.types.aconverted.interf.IfButtonOp
import dev.openrune.types.aconverted.interf.IfSubType
import org.rsmod.api.registry.controller.ControllerRegistry
import org.rsmod.api.registry.loc.LocRegistry
import org.rsmod.api.registry.loc.LocRegistryNormal
import org.rsmod.api.registry.loc.LocRegistryRegion
import org.rsmod.api.registry.npc.NpcRegistry
import org.rsmod.api.registry.region.RegionRegistry
import org.rsmod.api.registry.zone.ZonePlayerActivityBitSet
import org.rsmod.api.registry.zone.ZoneUpdateMap
import org.rsmod.api.repo.loc.LocRepository
import org.rsmod.api.route.BoundValidator
import org.rsmod.content.generic.locs.passages.GenericPassageScript
import org.rsmod.content.generic.locs.passages.StairNavigator
import org.rsmod.content.interfaces.emotes.PlayEmote
import org.rsmod.content.interfaces.gameframe.script.FriendsIgnoreScript
import org.rsmod.content.interfaces.gameframe.Gameframe
import org.rsmod.coroutine.GameCoroutine
import org.rsmod.events.EventBus
import org.rsmod.game.MapClock
import org.rsmod.game.client.Client
import org.rsmod.game.client.NoopClient
import org.rsmod.game.area.AreaIndex
import org.rsmod.game.cheat.CheatCommandMap
import org.rsmod.game.entity.ControllerList
import org.rsmod.game.entity.Npc
import org.rsmod.game.entity.NpcList
import org.rsmod.game.entity.Player
import org.rsmod.game.entity.PlayerList
import org.rsmod.game.entity.player.SessionStateEvent
import org.rsmod.game.entity.util.EntityFaceAngle
import org.rsmod.game.hit.Hit
import org.rsmod.game.hit.Hitmark
import org.rsmod.game.hit.HitType
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory
import org.rsmod.game.map.LocZoneStorage
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.loc.LocEntity
import org.rsmod.game.queue.EngineQueueCache
import org.rsmod.game.queue.WorldQueueList
import org.rsmod.game.region.RegionListLarge
import org.rsmod.game.region.RegionListSmall
import org.rsmod.game.region.RegionListWorldEntity
import org.rsmod.game.seq.EntitySeq
import org.rsmod.game.ui.UserInterface
import org.rsmod.game.ui.Component
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.ScriptContext
import org.rsmod.routefinder.collision.CollisionFlagMap

public fun main() {
    val cache = ServerCacheManager.init(240)
    try {
        val fixture = Fixture()
        fixture.verifyPrecreatedCharacterLogin()
        fixture.verifyLoginAndResume()
        fixture.verifyInstructorDialogueAndRecovery()
        fixture.verifyTrainingActions()
        fixture.verifySuccessfulProcessing()
        fixture.verifyTabsAndOverlay()
        fixture.verifyTutorialPresentation()
        fixture.verifyPendingPassageAndEquipment()
        fixture.verifyCombat()
        fixture.verifyLimitsAndDeparture()
        println("PASS: Tutorial Island login, resume, nine instructors, supplies, action gates, " +
            "passages, equipment, experience limits and departure")
    } finally {
        cache.close()
    }
}

private class Fixture {
    val events = EventBus()
    val progress = TutorialProgress(events)
    val ticks = TutorialTickHook(progress)
    val players = PlayerList()
    val npcs = NpcList()
    val collision = CollisionFlagMap()
    val packets = mutableListOf<Any>()
    val player = Player().apply {
        client = object : Client<Any, Any> by NoopClient {
            override fun write(message: Any) { packets.add(message) }
        }
        uuid = 123
        slotId = 1
        assignUid()
        coords = TutorialProgress.START
        currentMapClock = 100
        processedMapClock = 100
        inv = Inventory(InventoryServerType(size = 28, flags = 0), arrayOfNulls(28))
        worn = Inventory(InventoryServerType(size = 14, flags = 0), arrayOfNulls(14))
        statMap.setCurrentLevel("stat.hitpoints", 10)
        statMap.setBaseLevel("stat.hitpoints", 10)
        pendingSequence = EntitySeq.NULL
        pendingFaceAngle = EntityFaceAngle.NULL
    }
    val context: org.rsmod.api.player.protect.ProtectedAccessContext
    val script: TutorialScript
    val coroutine = GameCoroutine("tutorial-verification")
    private var result: Result<Unit>? = null

    init {
        val clock = MapClock(100)
        val updates = ZoneUpdateMap()
        val storage = LocZoneStorage()
        val normal = LocRegistryNormal(updates, collision, storage)
        val npcRegistry = NpcRegistry(npcs, collision, events)
        val regions = RegionRegistry(RegionListSmall(), RegionListLarge(), RegionListWorldEntity(),
            normal, collision, storage, npcRegistry,
            ControllerRegistry(clock, ControllerList()), ZonePlayerActivityBitSet())
        val locs = LocRepository(clock, LocRegistry(storage, normal,
            LocRegistryRegion(updates, collision, storage, regions)), regions)
        val stairs = StairNavigator(locs, collision)
        val passages = GenericPassageScript(locs, LocInteractions(BoundValidator(collision), events),
            stairs, WorldQueueList(), players)
        script = TutorialScript(progress, events, players, passages, stairs)
        val scripts = ScriptContext(events, CheatCommandMap(), EngineQueueCache())
        with(InvTransactionsScript(PlayerItemStorage(emptySet()))) { scripts.startup() }
        with(FriendsIgnoreScript(events)) { scripts.startup() }
        with(script) { scripts.startup() }
        context = ProtectedAccessContextFactory.empty().copy(
            getEventBus = { events }, getAlignment = { TextAlignment() },
            getCollision = { collision }, getNpcList = { npcs }, getPlayerList = { players },
            getTeleportValidator = { PlayerTeleportValidator(setOf(TutorialTeleportHook())) },
            getAreaChecker = { AreaChecker(regions, AreaIndex()) },
            getNpcInteractions = { NpcInteractions(events) },
        )
        for (coords in listOf(TutorialProgress.START, TutorialProgress.LUMBRIDGE)) {
            collision.allocateIfAbsent(coords.x, coords.z, coords.level)
        }
    }

    fun verifyLoginAndResume() {
        for (stage in TutorialStage.entries) {
            val lines = TutorialProgress.hintLines(stage.instruction)
            check(lines.size <= 3 && lines.all { it.length <= 40 })
            check(lines.joinToString(" ") == stage.instruction)
        }
        player.tutorialProgress = 0
        player.coords = CoordGrid(3222, 3218)
        events.publish(SessionStateEvent.PrepareLogin(player))
        check(player.coords == TutorialProgress.LUMBRIDGE && player.tutorialProgress == 0)
        VarPlayerIntMapSetter.set(player, "varbit.new_player_account", 1)
        events.publish(SessionStateEvent.PrepareLogin(player))
        check(player.coords == TutorialProgress.START && player.tutorialStage == TutorialStage.GUIDE)
        VarPlayerIntMapSetter.set(player, "varbit.new_player_account", 0)
        player.tutorialProgress = TutorialStage.SMITH.code
        player.coords = CoordGrid(3083, 9498)
        events.publish(SessionStateEvent.PrepareLogin(player))
        check(player.tutorialStage == TutorialStage.SMITH && player.coords == CoordGrid(3083, 9498))
        check(ServerCacheManager.getVarp("varp.tutorial".asRSCM())!!.scope ==
            dev.openrune.types.varp.VarpLifetime.Perm)
        check(!progress.advance(player, TutorialStage.GUIDE))
        check(player.tutorialStage == TutorialStage.SMITH)
    }

    fun verifyPrecreatedCharacterLogin() {
        val character = CharacterData(
            characterId = 1, displayName = "tutorial_fixture", previousDisplayName = null,
            displayNameChangedAtMillis = null, members = true, modLevel = null, worldId = null,
            coordX = 3222, coordZ = 3218, coordLevel = 0, varps = emptyMap(),
            createdAt = LocalDateTime.of(2026, 1, 1, 0, 0), lastLogin = null, lastLogout = null,
            mutedUntil = null, bannedUntil = null, runEnergy = 10000, xpRate = 1.0, attrs = emptyMap(),
        )
        val account = AccountData(1, "tutorial_fixture", Rights.NONE, null, characterData = character)
        val firstLogin = AccountLoadResponse.Ok.LoadAccount(AccountLoadAuth.UnknownDevice, account, emptyList())
        check(firstLogin.isNewAccount()) { "A precreated character's first game login is classified as returning" }
        player.coords = TutorialProgress.LUMBRIDGE
        player.tutorialProgress = 0
        VarPlayerIntMapSetter.set(player, "varbit.new_player_account", if (firstLogin.isNewAccount()) 1 else 0)
        events.publish(SessionStateEvent.PrepareLogin(player))
        check(player.coords == TutorialProgress.START && player.tutorialStage == TutorialStage.GUIDE)

        val returning = firstLogin.copy(account = account.copy(characterData = character.copy(
            lastLogin = LocalDateTime.of(2026, 1, 1, 1, 0),
        )))
        check(!returning.isNewAccount())
        check(!firstLogin.copy(account = account.copy(characterData = character.copy(
            lastLogout = LocalDateTime.of(2026, 1, 1, 2, 0),
        ))).isNewAccount())
        player.coords = TutorialProgress.LUMBRIDGE
        player.tutorialProgress = 0
        VarPlayerIntMapSetter.set(player, "varbit.new_player_account", 0)
        events.publish(SessionStateEvent.PrepareLogin(player))
        check(player.coords == TutorialProgress.LUMBRIDGE && player.tutorialProgress == 0)
        check(AccountLoadResponse.Ok.NewAccount(AccountLoadAuth.UnknownDevice, account, emptyList()).isNewAccount())
        println("PASS: precreated character first login enters tutorial; returning mainland characters stay put")
    }

    fun verifyInstructorDialogueAndRecovery() {
        val lessons = listOf(
            "npc.newbie_basics_instructor" to TutorialStage.GUIDE,
            "npc.newbie_survival_instructor" to TutorialStage.SURVIVAL,
            "npc.newbie_cook_instructor" to TutorialStage.CHEF,
            "npc.newbie_quest_instructor" to TutorialStage.QUEST,
            "npc.newbie_mining_instructor" to TutorialStage.MINER,
            "npc.newbie_combat_instructor" to TutorialStage.COMBAT,
            "npc.newbie_account_instructor" to TutorialStage.ACCOUNT,
            "npc.brother_noob" to TutorialStage.PRIEST,
            "npc.newbie_magic_instructor" to TutorialStage.MAGIC,
        )
        for ((npc, stage) in lessons) {
            player.coords = TutorialProgress.START
            player.tutorialProgress = stage.code
            packets.clear()
            talk(npc)
            if (stage == TutorialStage.GUIDE) {
                check(packets.any { packetText(it)?.startsWith("Welcome to RuneScape!") == true })
                check(packets.none { packetText(it)?.startsWith("Welcome to SoloScape!") == true })
            }
            check(player.tutorialStage == stage.next) { "$npc failed to advance $stage" }
        }
        player.inv.fillNulls()
        player.tutorialProgress = TutorialStage.COOK_RETRY.code
        talk("npc.newbie_survival_instructor")
        check(player.inv.contains("obj.net") && player.inv.contains("obj.bronze_axe") &&
            player.inv.contains("obj.tinderbox"))
        check(player.tutorialStage == TutorialStage.COOK_RETRY)
        player.inv.fillNulls()
        player.tutorialProgress = TutorialStage.CAST.code
        talk("npc.newbie_magic_instructor")
        check(player.inv.count("obj.airrune") == 10 && player.inv.count("obj.mindrune") == 10)
        talk("npc.newbie_magic_instructor")
        check(player.inv.count("obj.airrune") == 10)
        player.inv.fillNulls()
        for (slot in player.inv.indices) player.inv[slot] = InvObj("obj.bread", 1)
        player.tutorialProgress = TutorialStage.CHEF.code
        talk("npc.newbie_cook_instructor")
        check(player.tutorialStage == TutorialStage.CHEF)
        player.inv.fillNulls()
        talk("npc.newbie_cook_instructor")
        check(player.tutorialStage == TutorialStage.DOUGH)
    }

    fun verifySuccessfulProcessing() {
        player.coords = TutorialProgress.START
        player.tutorialProgress = TutorialStage.FIRE.code
        events.publish(SkillingProcessingEvent(player, "stat.cooking", "obj.raw_shrimp", "obj.shrimp"))
        check(player.tutorialStage == TutorialStage.FIRE)
        events.publish(SkillingProcessingEvent(player, "stat.firemaking", "obj.logs", "loc.fire"))
        check(player.tutorialStage == TutorialStage.COOK_FIRST)
        events.publish(SkillingProcessingEvent(player, "stat.cooking", "obj.raw_shrimp", "obj.burnt_shrimp"))
        check(player.tutorialStage == TutorialStage.COOK_RETRY)
        events.publish(SkillingProcessingEvent(player, "stat.cooking", "obj.raw_shrimp", "obj.burnt_shrimp"))
        check(player.tutorialStage == TutorialStage.COOK_RETRY)
        events.publish(SkillingProcessingEvent(player, "stat.cooking", "obj.raw_shrimp", "obj.shrimp"))
        check(player.tutorialStage == TutorialStage.SURVIVAL_FINISH)
        player.tutorialProgress = TutorialStage.SMITH.code
        events.publish(SkillingProcessingEvent(player, "stat.smithing", "obj.bronze_bar", "obj.bronze_sword"))
        check(player.tutorialStage == TutorialStage.SMITH)
        events.publish(SkillingProcessingEvent(player, "stat.smithing", "obj.bronze_bar", "obj.bronze_dagger"))
        check(player.tutorialStage == TutorialStage.LEAVE_MINE)
        player.tutorialProgress = TutorialStage.EMOTES.code
        events.publish(PlayEmote(player, ServerCacheManager.getAnim("seq.emote_yes".asRSCM())!!))
        check(player.tutorialStage == TutorialStage.RUN)
    }

    fun verifyTrainingActions() {
        player.inv.fillNulls()
        player.inv[0] = InvObj("obj.net", 1)
        player.coords = TutorialProgress.START
        player.tutorialProgress = TutorialStage.FISH.code
        talk("npc.0_48_48_newbiefishing")
        check(player.inv.count("obj.raw_shrimp") == 1 && player.tutorialStage == TutorialStage.STATS)
        player.inv[1] = InvObj("obj.bronze_axe", 1)
        player.tutorialProgress = TutorialStage.CHOP.code
        locAction("loc.newbietree", CoordGrid(3100, 3098))
        check(player.inv.count("obj.logs") == 1 && player.tutorialStage == TutorialStage.FIRE)
        player.inv.fillNulls()
        player.inv[0] = InvObj("obj.bronze_pickaxe", 1)
        player.coords = CoordGrid(3081, 9503)
        player.tutorialProgress = TutorialStage.PROSPECT_TIN.code
        locAction("loc.newbietinrock", CoordGrid(3075, 9504))
        check(player.tutorialStage == TutorialStage.PROSPECT_COPPER && !player.inv.contains("obj.tin_ore"))
        locAction("loc.newbiecopperrock", CoordGrid(3085, 9501))
        check(player.tutorialStage == TutorialStage.MINE_TIN)
        locAction("loc.newbietinrock", CoordGrid(3075, 9504))
        check(player.tutorialStage == TutorialStage.MINE_COPPER && player.inv.count("obj.tin_ore") == 1)
        locAction("loc.newbiecopperrock", CoordGrid(3085, 9501))
        check(player.tutorialStage == TutorialStage.SMELT && player.inv.count("obj.copper_ore") == 1)
        locAction("loc.newbiefurnace", CoordGrid(3078, 9495))
        check(player.tutorialStage == TutorialStage.MINER_RETURN && player.inv.count("obj.bronze_bar") == 1)
        check(!player.inv.contains("obj.copper_ore") && !player.inv.contains("obj.tin_ore"))
        player.tutorialProgress = TutorialStage.SMELT.code
        locAction("loc.newbiefurnace", CoordGrid(3078, 9495))
        check(player.tutorialStage == TutorialStage.SMELT && player.inv.count("obj.bronze_bar") == 1)
        player.coords = TutorialProgress.START
        player.inv.fillNulls()
        player.inv[0] = InvObj("obj.bread_dough", 1)
        player.tutorialProgress = TutorialStage.BREAD.code
        locAction("loc.newbierange", CoordGrid(3075, 3081))
        check(player.tutorialStage == TutorialStage.MUSIC && player.inv.count("obj.bread") == 1)
    }

    fun verifyPendingPassageAndEquipment() {
        player.tutorialProgress = TutorialStage.LEAVE_START.code
        val dest = CoordGrid(3098, 3107)
        player.attr[tutorialPassage] = TutorialPassage(TutorialStage.LEAVE_START, dest)
        player.coords = TutorialProgress.START
        ticks.onPostTick(player)
        check(player.tutorialStage == TutorialStage.LEAVE_START)
        player.coords = dest
        ticks.onPostTick(player)
        check(player.tutorialStage == TutorialStage.SURVIVAL)
        player.tutorialProgress = TutorialStage.EQUIP_SWORD.code
        player.worn[0] = InvObj("obj.bronze_sword", 1)
        ticks.onPostTick(player)
        check(player.tutorialStage == TutorialStage.EQUIP_SWORD)
        player.worn[1] = InvObj("obj.wooden_shield", 1)
        ticks.onPostTick(player)
        check(player.tutorialStage == TutorialStage.MELEE)
    }

    fun verifyTabsAndOverlay() {
        val frames = listOf("toplevel_osrs_stretch", "toplevel_pre_eoc", "toplevel", "toplevel_osm")
        for (frame in frames) {
            player.coords = TutorialProgress.START
            player.tutorialProgress = TutorialStage.SETTINGS.code
            player.ui.topLevel = UserInterface("interface.$frame".asRSCM())
            events.publish(SessionStateEvent.Login(player))
            check(player.ui.containsOverlay("interface.tutorial_overlay"))
            val component = ServerCacheManager.fromComponent("component.$frame:stone11")
            result = null
            val block: suspend () -> Unit = {
                check(events.publish(ProtectedAccess(player, coroutine, context),
                    IfOverlayButton(component, -1, null, IfButtonOp.Op1)))
            }
            block.startCoroutine(object : Continuation<Unit> {
                override val context = EmptyCoroutineContext
                override fun resumeWith(result: Result<Unit>) { this@Fixture.result = result }
            })
            result?.getOrThrow()
            check(player.tutorialStage == TutorialStage.GUIDE_RETURN)
        }
    }

    fun verifyLimitsAndDeparture() {
        check(TutorialExperience.limit(120, "stat.cooking", 1700, 400.0) == 40.0)
        check(TutorialExperience.limit(120, "stat.cooking", 1740, 400.0) == 0.0)
        check(TutorialExperience.limit(120, "stat.hitpoints", 11540, 100.0) == 0.0)
        check(TutorialExperience.limit(0, "stat.cooking", 1700, 400.0) == 400.0)
        check(TutorialExperience.limit(1000, "stat.cooking", 1700, 400.0) == 400.0)
        player.tutorialProgress = TutorialStage.DEPART.code
        check(TutorialTeleportHook().validate(player, TeleportType.Standard, context.areaChecker) != null)
        talk("npc.newbie_magic_instructor", listOf(2))
        check(player.tutorialStage == TutorialStage.DEPART)
        talk("npc.newbie_magic_instructor", listOf(1))
        check(player.tutorialStage == TutorialStage.COMPLETE && player.coords == TutorialProgress.LUMBRIDGE)
        check(!player.ui.containsOverlay("interface.tutorial_overlay"))
        check(!player.ui.containsOverlay("interface.messagebox_titled"))
        check(player.ui.containsOverlay("interface.magic_spellbook"))
        check(player.ui.containsOverlay("interface.side_channels"))
        check(TutorialTeleportHook().validate(player, TeleportType.Standard, context.areaChecker) == null)
        events.publish(SessionStateEvent.PrepareLogin(player))
        check(player.coords == TutorialProgress.LUMBRIDGE && player.tutorialStage == TutorialStage.COMPLETE)
    }

    fun verifyTutorialPresentation() {
        val slots = listOf("combat_interface", "stats", "side_journal", "inventory", "wornitems",
            "prayerbook", "magic_spellbook", "side_channels", "account", "friends", "logout",
            "settings_side", "emote", "music")
        val unlocks = listOf(TutorialStage.MELEE, TutorialStage.STATS, TutorialStage.JOURNAL,
            TutorialStage.INVENTORY, TutorialStage.EQUIPMENT, TutorialStage.PRAYER,
            TutorialStage.SPELLBOOK, TutorialStage.COMPLETE, TutorialStage.ACCOUNT,
            TutorialStage.FRIENDS, TutorialStage.GUIDE, TutorialStage.SETTINGS,
            TutorialStage.EMOTES, TutorialStage.MUSIC)
        val overlay = UserInterface("interface.tutorial_overlay".asRSCM())
        val hud = Component("component.toplevel_osrs_stretch:overlay_hud".asRSCM())
        val chat = Component("component.chatbox:chatoverlay".asRSCM())
        val bar = ServerCacheManager.fromComponent("component.tutorial_overlay:progressbar_container")
        check(bar.xMode == 1 && bar.yMode == 2 && bar.width == 370)
        // Load the production redirect tables, including the mobile fallback, rather than
        // pretending every client uses the desktop component ids.
        val loaderType = Class.forName("org.rsmod.content.interfaces.gameframe.GameframeLoader")
        val loader = loaderType.getDeclaredConstructor().apply { isAccessible = true }.newInstance()
        @Suppress("UNCHECKED_CAST")
        val gameframes = loaderType.getMethod("loadGameframes").invoke(loader) as Map<Int, Gameframe>
        for (frame in listOf("toplevel", "toplevel_pre_eoc", "toplevel_osrs_stretch", "toplevel_osm")) {
            player.ui.topLevel = UserInterface("interface.$frame".asRSCM())
            player.ui.gameframe.clear()
            for ((original, translated) in gameframes.getValue(player.ui.topLevel.id).mappings) {
                player.ui.gameframe[original] = translated
            }
            // Reproduce the ordinary gameframe's fully populated side panels on login.
            for ((slot, name) in slots.withIndex()) {
                player.ifOpenOverlay("interface.$name", "component.toplevel_osrs_stretch:side$slot", events)
            }
            player.tutorialProgress = TutorialStage.GUIDE.code
            events.publish(SessionStateEvent.Login(player))
            check(player.ui.overlays.getComponent(overlay) == hud)
            check(gameframes.getValue(player.ui.topLevel.id).mappings.getValue(hud).parent == player.ui.topLevel.id)
            check(player.ui.overlays[chat] == UserInterface("interface.messagebox_titled".asRSCM()))
            player.ifOpenSub("interface.chat_left", "component.chatbox:chatmodal", IfSubType.Modal, events)
            check(player.ui.containsModal("interface.chat_left"))
            check(player.ui.containsOverlay("interface.messagebox_titled"))
            player.ifCloseChat(events)
            check(!player.ui.containsModal("interface.chat_left"))
            check(player.ui.containsOverlay("interface.messagebox_titled"))
            for (stage in TutorialStage.entries.filter { it != TutorialStage.COMPLETE }) {
                player.tutorialProgress = stage.code
                progress.show(player)
                for ((slot, name) in slots.withIndex()) {
                    check(player.ui.containsOverlay("interface.$name") == (stage.code >= unlocks[slot].code)) {
                        "$frame $stage: incorrect visibility for $name"
                    }
                }
                check(packets.any { packetText(it) == stage.instruction })
            }
            // Restoring an earlier saved lesson closes later tabs again.
            player.tutorialProgress = TutorialStage.INVENTORY.code
            events.publish(SessionStateEvent.Login(player))
            check(player.ui.containsOverlay("interface.inventory"))
            check(!player.ui.containsOverlay("interface.stats"))
            events.publish(IfMoveSub(player, "component.toplevel_osrs_stretch:popout".asRSCM()))
            check(player.ui.overlays.getComponent(overlay) == hud)
            check(!player.ui.containsOverlay("interface.magic_spellbook"))
        }
        player.tutorialProgress = TutorialStage.IGNORE.code
        progress.show(player)
        player.ifOpenOverlay("interface.ignore", "component.toplevel_osrs_stretch:side9", events)
        ticks.onPostTick(player)
        check(player.tutorialStage == TutorialStage.PRIEST_RETURN)
        check(player.ui.containsOverlay("interface.ignore"))
        check(!player.ui.containsOverlay("interface.friends"))
        println("PASS: tutorial tab unlocks/resume, HUD progress placement, chat instructions, " +
            "RuneScape greeting, frame changes and Ignore selection")
    }

    private fun packetText(packet: Any): String? =
        packet.javaClass.methods.firstOrNull { it.name == "getText" && it.parameterCount == 0 }
            ?.invoke(packet) as? String

    fun verifyCombat() {
        players[player.slotId] = player
        player.coords = CoordGrid(3106, 9510)
        val rat = Npc("npc.newbiegiantrat", CoordGrid(3100, 9515))
        val chicken = Npc("npc.newbiechicken", CoordGrid(3140, 3095))
        fun hit(type: HitType, damage: Int = 1): Hit = Hit(type,
            Hitmark.fromPlayerSource(0, 0, null, damage, 0, player.slotId), player.uid.packed, null, null)
        player.tutorialProgress = TutorialStage.MELEE.code
        rat.hitpoints = 1
        events.publish(NpcHitEvents.AnyImpact(rat, hit(HitType.Melee)))
        check(player.tutorialStage == TutorialStage.MELEE)
        rat.hitpoints = 0
        events.publish(NpcHitEvents.AnyImpact(rat, hit(HitType.Ranged)))
        check(player.tutorialStage == TutorialStage.MELEE)
        events.publish(NpcHitEvents.AnyImpact(rat, hit(HitType.Melee)))
        check(player.tutorialStage == TutorialStage.COMBAT_RETURN)
        player.tutorialProgress = TutorialStage.RANGED.code
        events.publish(NpcHitEvents.AnyImpact(rat, hit(HitType.Melee)))
        check(player.tutorialStage == TutorialStage.RANGED)
        events.publish(NpcHitEvents.AnyImpact(rat, hit(HitType.Ranged)))
        check(player.tutorialStage == TutorialStage.LEAVE_COMBAT)
        player.tutorialProgress = TutorialStage.CAST.code
        events.publish(NpcHitEvents.AnyImpact(chicken, hit(HitType.Magic, 0)))
        check(player.tutorialStage == TutorialStage.CAST)
        events.publish(NpcHitEvents.AnyImpact(chicken, hit(HitType.Magic)))
        check(player.tutorialStage == TutorialStage.DEPART)
        player.statMap.setCurrentLevel("stat.hitpoints", 0)
        events.publish(PlayerHitpointsChangedEvent(player, 1, 0, 10, hit(HitType.Melee)))
        check(player.statMap.getCurrentLevel("stat.hitpoints").toInt() == 1)
    }

    private fun talk(symbol: String, choices: List<Int> = emptyList()) {
        val npc = Npc(symbol, player.coords.translateX(1))
        interaction(choices) {
            check(events.publish(ProtectedAccess(player, coroutine, context), NpcEvents.Op1(npc)))
        }
    }

    private fun locAction(symbol: String, coords: CoordGrid) {
        val type = checkNotNull(ServerCacheManager.getObject(symbol.asRSCM()))
        val loc = BoundLocInfo(LocInfo(2, coords, LocEntity(type.id, 10, 0)), type)
        interaction {
            check(events.publish(ProtectedAccess(player, coroutine, context), LocEvents.Op1(loc, loc, type)))
        }
    }

    private fun interaction(choices: List<Int> = emptyList(), block: suspend () -> Unit) {
        result = null
        player.activeCoroutine = coroutine
        block.startCoroutine(object : Continuation<Unit> {
            override val context = EmptyCoroutineContext
            override fun resumeWith(result: Result<Unit>) { this@Fixture.result = result }
        })
        result?.getOrThrow()
        val options = choices.iterator()
        repeat(200) {
            if (coroutine.isIdle) {
                result?.getOrThrow()
                return
            }
            if (coroutine.isAwaiting(ResumePauseButtonInput::class)) {
                val modal = listOf("chat_left", "chat_right", "messagebox", "chatmenu", "objectbox")
                    .firstOrNull { player.ui.containsModal("interface.$it") } ?: error("Missing dialogue")
                val input = when (modal) {
                    "chatmenu" -> ResumePauseButtonInput("component.chatmenu:options",
                        if (options.hasNext()) options.next() else 1)
                    "objectbox" -> ResumePauseButtonInput("component.objectbox:universe", -1)
                    else -> ResumePauseButtonInput("component.$modal:continue", -1)
                }
                coroutine.resumeWith(input)
            } else {
                player.currentMapClock++
                player.processedMapClock = player.currentMapClock
                player.pendingSequence = EntitySeq.NULL
                player.pendingFaceAngle = EntityFaceAngle.NULL
                coroutine.advance()
                PlayerFaceSquareProcessor().process(player)
            }
            result?.getOrThrow()
        }
        error("Tutorial interaction did not finish")
    }
}
