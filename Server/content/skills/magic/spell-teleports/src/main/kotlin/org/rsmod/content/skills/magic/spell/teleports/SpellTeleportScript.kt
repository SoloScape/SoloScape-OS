package org.rsmod.content.skills.magic.spell.teleports

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.aconverted.interf.IfButtonOp
import jakarta.inject.Inject
import org.rsmod.api.area.checker.AreaChecker
import org.rsmod.api.area.checker.wildernessLevel
import org.rsmod.api.combat.commons.magic.MagicSpell
import org.rsmod.api.combat.manager.MagicRuneManager
import org.rsmod.api.combat.manager.MagicRuneManager.Companion.isFailure
import org.rsmod.api.config.refs.params
import org.rsmod.api.invtx.invTransaction
import org.rsmod.api.invtx.select
import org.rsmod.api.player.hook.PlayerTeleportValidator
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.api.player.output.ChatType
import org.rsmod.api.player.output.clearMapFlag
import org.rsmod.api.player.output.mes
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.script.onIfOverlayButton
import org.rsmod.api.script.onOpHeld1
import org.rsmod.api.script.onOpHeld3
import org.rsmod.api.script.onOpHeld4
import org.rsmod.api.script.onPlayerQueueWithArgs
import org.rsmod.api.spells.MagicSpellRegistry
import org.rsmod.content.quest.manager.QuestRequirements
import org.rsmod.content.skills.construction.HouseAccess
import org.rsmod.content.skills.construction.house.HouseStore
import org.rsmod.content.skills.construction.houseTeleportBuildMode
import org.rsmod.content.skills.construction.houseTeleportOutside
import org.rsmod.game.inv.isType
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class SpellTeleportScript
@Inject
constructor(
    private val spells: MagicSpellRegistry,
    private val runes: MagicRuneManager,
    private val teleportValidator: PlayerTeleportValidator,
    private val areaChecker: AreaChecker,
    private val houseAccess: HouseAccess,
    private val houseStore: HouseStore,
) : PluginScript() {
    override fun ScriptContext.startup() {
        for (teleport in SpellTeleport.entries) {
            val spell = teleport.resolveSpell() ?: continue
            onIfOverlayButton(spell.component) { castSpellTeleport(spell, teleport, it.op) }
        }
        for (tablet in TeleportTablet.entries) {
            onOpHeld1(tablet.obj) { breakTeleportTablet(tablet, it.slot) }
        }
        for (item in DirectTeleportItem.entries) {
            when (item.op) {
                1 -> onOpHeld1(item.obj) { useDirectTeleportItem(item, it.slot) }
                3 -> onOpHeld3(item.obj) { useDirectTeleportItem(item, it.slot) }
                else -> error("Unsupported direct teleport item op: ${item.op}")
            }
        }
        for (tablet in RedirectedHouseTablet.entries) {
            onOpHeld4(tablet.obj) { revertRedirectedTablet(tablet) }
        }
        for (config in TabletWarningConfig.entries) {
            onOpHeld4(config.obj) { toggleTabletWarning(config) }
        }
        onPlayerQueueWithArgs<PendingSpellTeleport>(TeleportQueue) {
            processQueuedTeleport(it.args)
        }
    }

    private fun SpellTeleport.resolveSpell(): MagicSpell? {
        val spellObj = ServerCacheManager.getItem(spellObj.asRSCM(RSCMType.OBJ)) ?: return null
        return spells.getObjSpell(spellObj)
    }

    private suspend fun ProtectedAccess.castSpellTeleport(
        spell: MagicSpell,
        teleport: SpellTeleport,
        op: IfButtonOp,
    ) {
        if (actionDelay > mapClock) {
            return
        }

        if (!teleport.canCast(this)) {
            return
        }

        val option = teleport.option(op)
        val house = if (teleport == SpellTeleport.TeleportToHouse) houseStore.state(player) else null
        val destination = if (house != null) {
            house.location.arrive.takeIf { house.owned }
        } else {
            teleport.destination(spell, option)
        }
        if (destination == null) {
            mes(option.missingDestinationMessage)
            return
        }

        if (!canTeleport()) {
            return
        }

        if (!consumeRequirements(spell, teleport)) {
            return
        }

        val style = teleport.style
        actionDelay = mapClock + TeleportActionDelay
        anim(style.startAnim)
        spotanim(style.spotanim, height = style.spotanimHeight)
        soundSynth(TeleportSound)
        clearQueue(TeleportQueue)
        val houseInside = house != null && op != IfButtonOp.Op2 && !player.houseTeleportOutside
        queue(TeleportQueue, TeleportDelay, PendingSpellTeleport(
            teleport, destination.packed, houseInside, houseInside && player.houseTeleportBuildMode,
        ))
    }

    private suspend fun ProtectedAccess.breakTeleportTablet(tablet: TeleportTablet, slot: Int) {
        if (actionDelay > mapClock) {
            return
        }

        val teleport = tablet.teleport
        if (!teleport.canCast(this)) {
            return
        }

        val spell = teleport.resolveSpell() ?: return
        val option = teleport.option(IfButtonOp.Op1)
        val house = if (teleport == SpellTeleport.TeleportToHouse) houseStore.state(player) else null
        val destination = if (house != null) {
            house.location.arrive.takeIf { house.owned }
        } else {
            teleport.destination(spell, option)
        }
        if (destination == null) {
            mes(option.missingDestinationMessage)
            return
        }

        if (!canTeleport() || !confirmConfiguredWarning(tablet.obj, destination)) {
            return
        }
        if (invDel(inv, tablet.obj, count = 1, slot = slot).failure) {
            return
        }

        actionDelay = mapClock + TabletActionDelay
        clearQueue(TeleportQueue)
        anim(TabletBreakAnim)
        soundSynth(TabletBreakSound)
        delay(1)
        spotanim(TabletAbsorbSpotanim)
        anim(TabletTeleportAnim)
        delay(1)

        if (!canTeleport()) {
            return
        }
        val houseInside = house != null && !player.houseTeleportOutside
        if (houseInside) {
            houseAccess.enter(this, player.houseTeleportBuildMode)
        } else {
            houseAccess.clearSession(player)
            telejump(destination)
        }
    }

    private suspend fun ProtectedAccess.useDirectTeleportItem(item: DirectTeleportItem, slot: Int) {
        if (actionDelay > mapClock || !canTeleport() || !confirmConfiguredWarning(item.obj, item.destination)) {
            return
        }
        if (invDel(inv, item.obj, count = 1, slot = slot).failure) {
            return
        }

        actionDelay = mapClock + item.style.actionDelay
        clearQueue(TeleportQueue)
        when (item.style) {
            ConsumableTeleportStyle.Tablet -> {
                anim(TabletBreakAnim)
                soundSynth(TabletBreakSound)
                delay(1)
                spotanim(TabletAbsorbSpotanim)
                anim(TabletTeleportAnim)
                delay(1)
            }
            ConsumableTeleportStyle.Scroll -> {
                anim(ScrollOpenAnim)
                spotanim(ScrollTeleportSpotanim, height = 92)
                delay(ScrollTeleportDelay)
            }
            ConsumableTeleportStyle.VolcanicTablet -> {
                anim(VolcanicTabletBreakAnim)
                delay(1)
                anim(VolcanicTabletTeleportAnim)
                delay(2)
            }
        }

        houseAccess.clearSession(player)
        telejump(item.destination)
    }

    private suspend fun ProtectedAccess.confirmConfiguredWarning(obj: String, destination: CoordGrid): Boolean {
        val config = TabletWarningConfig.entries.firstOrNull { it.obj == obj } ?: return true
        if (vars[config.varbit] == 0) {
            return true
        }
        val level = destination.wildernessLevel(areaChecker)
        if (level <= 0) {
            return true
        }

        mesbox(
            "<col=7f0000>Warning!</col> This teleport leads to level $level " +
                "<col=7f0000>Wilderness</col>. Other players may be able to attack you there.",
        )
        return choice2(
            "Yes, teleport anyway.",
            true,
            "No, I've changed my mind.",
            false,
            title = "Teleport into the Wilderness?",
        )
    }

    private fun ProtectedAccess.revertRedirectedTablet(tablet: RedirectedHouseTablet) {
        if (invReplace(inv, tablet.obj, 1, HouseTeleportTablet).failure) {
            return
        }
        mes("You revert the tablet to a Teleport to house tablet.")
    }

    private fun ProtectedAccess.toggleTabletWarning(config: TabletWarningConfig) {
        val enabled = vars[config.varbit] == 0
        vars[config.varbit] = if (enabled) 1 else 0
        mes("Teleport warning ${if (enabled) "enabled" else "disabled"}.")
    }

    private fun ProtectedAccess.processQueuedTeleport(task: PendingSpellTeleport) {
        val spell = task.teleport.resolveSpell() ?: return
        if (!canTeleport()) {
            return
        }
        if (task.houseInside) {
            houseAccess.enter(this, task.houseBuildMode)
        } else {
            houseAccess.clearSession(player)
            telejump(CoordGrid(task.destination))
        }
        task.teleport.style.endAnim?.let { anim(it) }
        statAdvance("stat.magic", spell.castXp)
    }

    private fun ProtectedAccess.canTeleport(): Boolean {
        val denial =
            teleportValidator.validate(player, TeleportType.Standard, areaChecker)
        if (denial == null) {
            return true
        }
        player.clearMapFlag()
        player.mes(denial, ChatType.Engine)
        return false
    }

    private fun ProtectedAccess.consumeRequirements(
        spell: MagicSpell,
        teleport: SpellTeleport,
    ): Boolean {
        val castSpell =
            if (teleport == SpellTeleport.ApeAtoll) {
                val banana = ServerCacheManager.getItem(Banana.asRSCM(RSCMType.OBJ)) ?: return false
                val spellWithoutBanana = spell.copy(objReqs = spell.objReqs.withoutBananaReq())
                if (!runes.canCastSpell(player, spellWithoutBanana)) {
                    return false
                }
                if (!deleteBanana(banana)) {
                    mes("You need a banana to cast this spell.")
                    return false
                }
                spellWithoutBanana
            } else {
                spell
            }

        if (castSpell.objReqs.isEmpty()) {
            return runes.canCastSpell(player, castSpell)
        }
        return !runes.attemptCast(player, castSpell).isFailure()
    }

    private fun List<MagicSpell.ObjRequirement>.withoutBananaReq(): List<MagicSpell.ObjRequirement> {
        return filterNot { RSCM.getReverseMapping(RSCMType.OBJ, it.obj.id).contains("banana") }
    }

    private fun ProtectedAccess.deleteBanana(banana: ItemServerType): Boolean {
        val bananaSlot = inv.indexOfFirst { it.isType(banana) }
        if (bananaSlot == -1) {
            return false
        }
        val transaction =
            player.invTransaction(inv, autoCommit = true) {
                val targetInv = select(inv)
                delete {
                    from = targetInv
                    obj = banana.id
                    strictCount = 1
                    strictSlot = bananaSlot
                }
            }
        return transaction.success
    }

    private data class PendingSpellTeleport(
        val teleport: SpellTeleport,
        val destination: Int,
        val houseInside: Boolean = false,
        val houseBuildMode: Boolean = false,
    )

    private enum class TeleportTablet(val obj: String, val teleport: SpellTeleport) {
        Varrock("obj.poh_tablet_varrockteleport", SpellTeleport.Varrock),
        Lumbridge("obj.poh_tablet_lumbridgeteleport", SpellTeleport.Lumbridge),
        Falador("obj.poh_tablet_faladorteleport", SpellTeleport.Falador),
        Camelot("obj.poh_tablet_camelotteleport", SpellTeleport.Camelot),
        Ardougne("obj.poh_tablet_ardougneteleport", SpellTeleport.Ardougne),
        Watchtower("obj.poh_tablet_watchtowerteleport", SpellTeleport.Watchtower),
        TeleportToHouse("obj.poh_tablet_teleporttohouse", SpellTeleport.TeleportToHouse),
        KourendCastle("obj.poh_tablet_kourendteleport", SpellTeleport.KourendCastle),
        CivitasIllaFortis("obj.poh_tablet_fortisteleport", SpellTeleport.CivitasIllaFortis),
        Paddewwa("obj.tablet_paddewa", SpellTeleport.Paddewwa),
        Senntisten("obj.tablet_senntisten", SpellTeleport.Senntisten),
        Kharyrll("obj.tablet_kharyll", SpellTeleport.Kharyrll),
        Lassar("obj.tablet_lassar", SpellTeleport.Lassar),
        Dareeyak("obj.tablet_dareeyak", SpellTeleport.Dareeyak),
        Carrallanger("obj.tablet_carrallangar", SpellTeleport.Carrallanger),
        Annakarl("obj.tablet_annakarl", SpellTeleport.Annakarl),
        Ghorrock("obj.tablet_ghorrock", SpellTeleport.Ghorrock),
    }

    private enum class DirectTeleportItem(
        val obj: String,
        val destination: CoordGrid,
        val style: ConsumableTeleportStyle = ConsumableTeleportStyle.Tablet,
        val op: Int = 1,
    ) {
        ArceuusLibrary("obj.teletab_lumbridge", CoordGrid(1632, 3838, 0)),
        DraynorManor("obj.teletab_draynor", CoordGrid(3108, 3352, 0)),
        MindAltar("obj.teletab_mind_altar", CoordGrid(2979, 3509, 0)),
        SalveGraveyard("obj.teletab_salve", CoordGrid(3433, 3461, 0)),
        FenkenstrainsCastle("obj.teletab_fenk", CoordGrid(3548, 3528, 0)),
        WestArdougne("obj.teletab_westardy", CoordGrid(2500, 3291, 0)),
        HarmonyIsland("obj.teletab_harmony", CoordGrid(3797, 2866, 0)),
        Cemetery("obj.teletab_cemetery", CoordGrid(2978, 3763, 0)),
        Barrows("obj.teletab_barrows", CoordGrid(3565, 3315, 0)),
        ApeAtollArceuus("obj.teletab_ape", CoordGrid(2770, 2703, 0)),
        Battlefront("obj.teletab_battlefront", CoordGrid(1349, 3739, 0)),

        Moonclan("obj.lunar_tablet_moonclan_teleport", CoordGrid(2113, 3915, 0)),
        Ourania("obj.lunar_tablet_ourania_teleport", CoordGrid(2468, 3246, 0)),
        Waterbirth("obj.lunar_tablet_waterbirth_teleport", CoordGrid(2546, 3755, 0)),
        Barbarian("obj.lunar_tablet_barbarian_teleport", CoordGrid(2543, 3568, 0)),
        Khazard("obj.lunar_tablet_khazard_teleport", CoordGrid(2636, 3167, 0)),
        FishingGuild("obj.lunar_tablet_fishing_guild_teleport", CoordGrid(2612, 3391, 0)),
        Catherby("obj.lunar_tablet_catherby_teleport", CoordGrid(2802, 3449, 0)),
        IcePlateau("obj.lunar_tablet_ice_plateau_teleport", CoordGrid(2973, 3939, 0)),

        Rimmington("obj.nzone_teletab_rimmington", CoordGrid(2954, 3224, 0)),
        Taverley("obj.nzone_teletab_taverley", CoordGrid(2894, 3465, 0)),
        Pollnivneach("obj.nzone_teletab_pollnivneach", CoordGrid(3340, 3004, 0)),
        Rellekka("obj.nzone_teletab_rellekka", CoordGrid(2670, 3632, 0)),
        Brimhaven("obj.nzone_teletab_brimhaven", CoordGrid(2758, 3178, 0)),
        Yanille("obj.nzone_teletab_yanille", CoordGrid(2544, 3095, 0)),
        TrollheimRedirect("obj.nzone_teletab_trollheim", CoordGrid(2891, 3678, 0)),
        Hosidius("obj.nzone_teletab_kourend", CoordGrid(1744, 3517, 0)),
        Prifddinas("obj.nzone_teletab_prifddinas", CoordGrid(3239, 6076, 0)),
        Aldarin("obj.nzone_teletab_aldarin", CoordGrid(1422, 2966, 0)),

        WildernessCrabs("obj.tablet_wildycrabs", CoordGrid(3348, 3783, 0)),
        VolcanicMine(
            "obj.fossil_tablet_volcanoteleport",
            CoordGrid(3818, 3801, 0),
            ConsumableTeleportStyle.VolcanicTablet,
        ),

        Nardah(
            "obj.teleportscroll_nardah",
            CoordGrid(3421, 2917, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        Digsite(
            "obj.teleportscroll_digsite",
            CoordGrid(3324, 3412, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        FeldipHills(
            "obj.teleportscroll_feldip",
            CoordGrid(2542, 2925, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        LunarIsleScroll(
            "obj.teleportscroll_lunarisle",
            CoordGrid(2093, 3912, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        Mortton(
            "obj.teleportscroll_mortton",
            CoordGrid(3489, 3288, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        PestControl(
            "obj.teleportscroll_pestcontrol",
            CoordGrid(2657, 2660, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        Piscatoris(
            "obj.teleportscroll_piscatoris",
            CoordGrid(2339, 3648, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        TaiBwoWannai(
            "obj.teleportscroll_taibwo",
            CoordGrid(2788, 3066, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        IorwerthCamp(
            "obj.teleportscroll_elf",
            CoordGrid(2193, 3257, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        MosLeHarmless(
            "obj.teleportscroll_mosles",
            CoordGrid(3701, 2996, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        Lumberyard(
            "obj.teleportscroll_lumberyard",
            CoordGrid(3303, 3487, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        ZulAndra(
            "obj.teleportscroll_zulandra",
            CoordGrid(2197, 3056, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        KeyMaster(
            "obj.teleportscroll_cerberus",
            CoordGrid(2686, 9882, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        RevenantCave(
            "obj.teleportscroll_revenants",
            CoordGrid(3127, 3833, 0),
            ConsumableTeleportStyle.Scroll,
            op = 3,
        ),
        Watson(
            "obj.teleportscroll_watson",
            CoordGrid(1645, 3579, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        GuthixianTemple(
            "obj.teleportscroll_guthixian_temple",
            CoordGrid(4062, 4558, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        SpiderCave(
            "obj.teleportscroll_spidercave",
            CoordGrid(3658, 3403, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        ColossalWyrm(
            "obj.teleportscroll_colossal_wyrm",
            CoordGrid(1641, 2921, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        ChasmOfFire(
            "obj.teleportscroll_chasmoffire",
            CoordGrid(1311, 9882, 0),
            ConsumableTeleportStyle.Scroll,
        ),
        Ardeaglais(
            "obj.teleportscroll_ardeaglais",
            CoordGrid(2543, 2216, 0),
            ConsumableTeleportStyle.Scroll,
        ),
    }

    private enum class RedirectedHouseTablet(val obj: String) {
        Rimmington("obj.nzone_teletab_rimmington"),
        Taverley("obj.nzone_teletab_taverley"),
        Pollnivneach("obj.nzone_teletab_pollnivneach"),
        Rellekka("obj.nzone_teletab_rellekka"),
        Brimhaven("obj.nzone_teletab_brimhaven"),
        Yanille("obj.nzone_teletab_yanille"),
        Trollheim("obj.nzone_teletab_trollheim"),
        Hosidius("obj.nzone_teletab_kourend"),
        Prifddinas("obj.nzone_teletab_prifddinas"),
        Aldarin("obj.nzone_teletab_aldarin"),
    }

    private enum class TabletWarningConfig(val obj: String, val varbit: String) {
        Dareeyak("obj.tablet_dareeyak", "varbit.teletab_dareeyak_warning"),
        Carrallanger("obj.tablet_carrallangar", "varbit.teletab_carrallangar_warning"),
        Annakarl("obj.tablet_annakarl", "varbit.teletab_annakarl_warning"),
        Ghorrock("obj.tablet_ghorrock", "varbit.teletab_ghorrock_warning"),
        Cemetery("obj.teletab_cemetery", "varbit.teletab_cemetery_warning"),
        IcePlateau("obj.lunar_tablet_ice_plateau_teleport", "varbit.teletab_ice_plateau_warning"),
        WildernessCrabs("obj.tablet_wildycrabs", "varbit.teletab_wildycrabs_warning"),
    }

    private enum class ConsumableTeleportStyle(val actionDelay: Int) {
        Tablet(3),
        Scroll(4),
        VolcanicTablet(4),
    }

    private enum class SpellTeleport(
        val spellObj: String,
        val destination: CoordGrid? = null,
        val destinationLevel: Int? = null,
        val alternate: TeleportOption? = null,
        val requiredQuest: String? = null,
        val lockedMessage: String = "You need to complete the required quest to cast this spell.",
        val missingDestinationMessage: String = "That teleport is not implemented yet.",
        val style: TeleportStyle = TeleportStyle.Standard,
    ) {
        Home(
            "obj.48_home_teleport",
            CoordGrid(3222, 3222, 0),
        ),
        Varrock(
            "obj.25_varrock_teleport",
            alternate = TeleportOption(destination = CoordGrid(3164, 3487, 0)),
        ),
        Lumbridge(
            "obj.31_lumbridge_teleport",
        ),
        Falador(
            "obj.37_falador_teleport",
        ),
        TeleportToHouse(
            "obj.67_house_teleport",
            alternate =
                TeleportOption(
                    missingDestinationMessage =
                        "You need to purchase a house before you can teleport outside it."
                ),
            missingDestinationMessage = "You need to purchase a house before you can use this spell.",
        ),
        Camelot(
            "obj.45_camelot_teleport",
            alternate = TeleportOption(destination = CoordGrid(2725, 3485, 0)),
        ),
        KourendCastle(
            // Cache name is wrong, but its spell params match Kourend Castle Teleport.
            "obj.cert_deadman_level99_lamp",
            requiredQuest = "quest_clientofkourend",
            lockedMessage = "You need to complete Client of Kourend to cast this spell.",
        ),
        Ardougne(
            "obj.51_ardougne_teleport",
            requiredQuest = "quest_plaguecity",
            lockedMessage = "You need to complete Plague City to cast this spell.",
        ),
        CivitasIllaFortis(
            // Cache name is wrong, but its spell params match Civitas illa Fortis Teleport.
            "obj.placeholder_blighted_sack_snare",
            requiredQuest = "quest_twilightspromise",
            lockedMessage = "You need to complete Twilight's Promise to cast this spell.",
        ),
        Watchtower(
            "obj.58_watchtower_teleport",
            alternate = TeleportOption(destination = CoordGrid(2544, 3095, 0)),
            requiredQuest = "quest_watchtowerquest",
            lockedMessage = "You need to complete Watchtower to cast this spell.",
        ),
        Trollheim(
            "obj.61_trollheim_teleport",
            requiredQuest = "quest_eadgarsruse",
            lockedMessage = "You need to complete Eadgar's Ruse to cast this spell.",
        ),
        ApeAtoll(
            "obj.64_ape_atoll_teleport",
            destinationLevel = 1,
        ),
        TeleportBoatToMe(
            "obj.56_teleport_boat_to_me",
            requiredQuest = "quest_pandemonium",
            lockedMessage = "You need to complete Pandemonium to cast this spell.",
            missingDestinationMessage = "Boat teleports need boat-location support before they can be cast.",
        ),
        TeleportMeToBoat(
            "obj.67_teleport_me_to_boat",
            alternate =
                TeleportOption(
                    missingDestinationMessage =
                        "Last boat teleports need boat-location support before they can be cast."
                ),
            requiredQuest = "quest_pandemonium",
            lockedMessage = "You need to complete Pandemonium to cast this spell.",
            missingDestinationMessage = "Boat teleports need boat-location support before they can be cast.",
        ),
        EdgevilleHome("obj.01_zaros_home_tele", CoordGrid(3087, 3496, 0), style = TeleportStyle.Ancient),
        Paddewwa(
            "obj.54_paddewwa_teleport",
            requiredQuest = "quest_deserttreasure",
            lockedMessage = "You need to complete Desert Treasure I to use this teleport.",
            style = TeleportStyle.Ancient,
        ),
        Senntisten(
            "obj.60_senntisten_teleport",
            requiredQuest = "quest_deserttreasure",
            lockedMessage = "You need to complete Desert Treasure I to use this teleport.",
            style = TeleportStyle.Ancient,
        ),
        Kharyrll(
            "obj.66_kharyllyl_teleport",
            requiredQuest = "quest_deserttreasure",
            lockedMessage = "You need to complete Desert Treasure I to use this teleport.",
            style = TeleportStyle.Ancient,
        ),
        Lassar(
            "obj.72_lassar_teleport",
            requiredQuest = "quest_deserttreasure",
            lockedMessage = "You need to complete Desert Treasure I to use this teleport.",
            style = TeleportStyle.Ancient,
        ),
        Dareeyak(
            "obj.78_dareeyak_teleport",
            requiredQuest = "quest_deserttreasure",
            lockedMessage = "You need to complete Desert Treasure I to use this teleport.",
            style = TeleportStyle.Ancient,
        ),
        Carrallanger(
            "obj.84_carrallagar_teleport",
            requiredQuest = "quest_deserttreasure",
            lockedMessage = "You need to complete Desert Treasure I to use this teleport.",
            style = TeleportStyle.Ancient,
        ),
        Annakarl(
            "obj.90_annakarl_teleport",
            requiredQuest = "quest_deserttreasure",
            lockedMessage = "You need to complete Desert Treasure I to use this teleport.",
            style = TeleportStyle.Ancient,
        ),
        Ghorrock(
            "obj.96_ghorrock_teleport",
            requiredQuest = "quest_deserttreasure",
            lockedMessage = "You need to complete Desert Treasure I to use this teleport.",
            style = TeleportStyle.Ancient,
        );

        fun option(op: IfButtonOp): TeleportOption {
            return if (op == IfButtonOp.Op2 && alternate != null) {
                alternate
            } else {
                TeleportOption(destination, destinationLevel, missingDestinationMessage)
            }
        }

        fun destination(spell: MagicSpell, option: TeleportOption): CoordGrid? {
            val coord = option.destination ?: destination ?: spell.obj.paramOrNull(params.spell_telecoord)
            val level = option.destinationLevel ?: destinationLevel
            return if (coord != null && level != null) {
                coord.copy(level = level)
            } else {
                coord
            }
        }

        fun canCast(access: ProtectedAccess): Boolean {
            val questKey = requiredQuest ?: return true
            if (QuestRequirements.hasCompleted(access.player, questKey)) {
                return true
            }
            access.mes(lockedMessage)
            return false
        }
    }

    private data class TeleportOption(
        val destination: CoordGrid? = null,
        val destinationLevel: Int? = null,
        val missingDestinationMessage: String = "That teleport is not implemented yet.",
    )

    private enum class TeleportStyle(
        val startAnim: String,
        val endAnim: String?,
        val spotanim: String,
        val spotanimHeight: Int,
    ) {
        Standard(
            startAnim = RSCM.getReverseMapping(RSCMType.SEQ, 714),
            endAnim = RSCM.getReverseMapping(RSCMType.SEQ, 715),
            spotanim = RSCM.getReverseMapping(RSCMType.SPOTANIM, 111),
            spotanimHeight = 92,
        ),
        Ancient(
            startAnim = "seq.zaros_vertical_casting",
            endAnim = null,
            spotanim = "spotanim.zaros_teleport",
            spotanimHeight = 0,
        ),
    }

    private companion object {
        private const val Banana = "obj.banana"
        private const val HouseTeleportTablet = "obj.poh_tablet_teleporttohouse"
        private const val TeleportQueue = "queue.spell_teleport"
        private const val TeleportSound = "synth.teleport_all"
        private const val TeleportDelay = 4
        private const val TeleportActionDelay = 5
        private const val TabletActionDelay = 3
        private const val TabletBreakAnim = "seq.poh_smash_magic_tablet"
        private const val TabletBreakSound = "synth.poh_teleport_tablet"
        private const val TabletTeleportAnim = "seq.poh_absorb_tablet_teleport"
        private const val TabletAbsorbSpotanim = "spotanim.poh_absorb_tablet_magic"
        private const val ScrollOpenAnim = "seq.teleport_scroll_open"
        private const val ScrollTeleportSpotanim = "spotanim.telescroll_teleport"
        private const val ScrollTeleportDelay = 3
        private const val VolcanicTabletBreakAnim = "seq.fossil_tablet_volcano"
        private const val VolcanicTabletTeleportAnim = "seq.human_fossil_volcano_teleport"
    }
}
