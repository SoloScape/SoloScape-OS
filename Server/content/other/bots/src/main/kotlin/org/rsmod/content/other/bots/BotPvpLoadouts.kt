package org.rsmod.content.other.bots

import kotlin.math.roundToInt
import org.rsmod.api.combat.commons.magic.Spellbook

// Native equivalents of RSPSApp/tsps loadout archetypes; see resources/TSPS-LICENSE.txt.
data class BotPvpLoadout(
    val id: String,
    val members: Boolean,
    val levels: Map<String, Int>,
    val styles: Map<BotPvpStyle, List<String>>,
    val primaryStyle: BotPvpStyle,
    val specialWeapons: List<String>,
    val spellbook: Spellbook,
    val attackSpell: String?,
    val freezeSpell: String?,
    val vengeance: Boolean,
    val food: String,
    val consumables: Map<String, Int>,
    val runes: Map<String, Int>,
    val runePacks: Map<Int, Int> = emptyMap(),
)

object BotPvpLoadouts {
    internal const val BLIGHTED_ANCIENT_ICE_SACK_ID = 24607
    internal const val BLIGHTED_ANCIENT_ICE_SACK_COUNT = 100
    private fun levels(
        attack: Int = 99, defence: Int = 99, strength: Int = 99,
        hitpoints: Int = 99, ranged: Int = 99, magic: Int = 99, prayer: Int = 99,
    ): Map<String, Int> = mapOf(
        "stat.attack" to attack, "stat.defence" to defence, "stat.strength" to strength,
        "stat.hitpoints" to hitpoints, "stat.ranged" to ranged, "stat.magic" to magic,
        "stat.prayer" to prayer,
    )

    private fun exactLevels(id: String): Map<String, Int> {
        val stats = checkNotNull(BotPvpTspsStats.byId[id]) { "Missing TSPS stats for $id" }
        check(stats.size == 7)
        return levels(
            attack = stats[0], defence = stats[1], strength = stats[2], hitpoints = stats[3],
            ranged = stats[4], prayer = stats[5], magic = stats[6],
        )
    }

    private val melee = listOf(
        "obj.abyssal_whip", "obj.rune_full_helm", "obj.rune_chainbody",
        "obj.rune_platelegs", "obj.rune_kiteshield", "obj.amulet_of_glory",
        "obj.death_climbingboots",
    )
    private val pureMelee = listOf(
        "obj.dragon_scimitar", "obj.amulet_of_glory", "obj.death_climbingboots",
    )
    private val ranged = listOf(
        "obj.magic_shortbow", "obj.rune_arrow", "obj.black_dragonhide_body",
        "obj.black_dragonhide_chaps", "obj.black_dragon_vambraces",
        "obj.coif", "obj.amulet_of_glory", "obj.leather_boots",
    )
    private val pureRanged = listOf(
        "obj.magic_shortbow", "obj.rune_arrow", "obj.leather_armour",
        "obj.black_dragonhide_chaps", "obj.black_dragon_vambraces",
        "obj.amulet_of_glory", "obj.death_climbingboots",
    )
    private val magic = listOf(
        "obj.trail_ancient_staff", "obj.mystic_robe_top", "obj.mystic_robe_bottom",
        "obj.amulet_of_glory", "obj.death_climbingboots",
    )
    private val pureMagic = listOf(
        "obj.trail_ancient_staff", "obj.wizards_robe", "obj.blue_skirt",
        "obj.amulet_of_glory", "obj.death_climbingboots",
    )
    private val f2pRanged = listOf(
        "obj.maple_shortbow", "obj.adamant_arrow", "obj.leather_armour",
        "obj.dragonhide_chaps", "obj.dragon_vambraces", "obj.coif",
    )
    private val f2pMelee = listOf(
        "obj.rune_scimitar", "obj.rune_full_helm", "obj.rune_chainbody",
        "obj.rune_platelegs", "obj.rune_kiteshield", "obj.amulet_of_strength",
    )
    private val f2pMagic = listOf("obj.staff_of_fire", "obj.wizards_robe", "obj.blue_skirt")
    private val f2pKo = listOf("obj.rune_2h_sword", "obj.amulet_of_strength")

    private val ancientRunes = mapOf(
        "obj.waterrune" to 1000, "obj.deathrune" to 400, "obj.bloodrune" to 400,
    )
    private val lunarRunes = mapOf(
        "obj.astralrune" to 200, "obj.deathrune" to 200, "obj.earthrune" to 1000,
    )
    private val standardRunes = mapOf(
        "obj.airrune" to 1000, "obj.bloodrune" to 300, "obj.naturerune" to 300,
        "obj.earthrune" to 1000, "obj.waterrune" to 1000, "obj.chaosrune" to 300,
        "obj.lawrune" to 300, "obj.deathrune" to 300,
    )
    private val f2pMagicRunes = mapOf(
        "obj.airrune" to 1000, "obj.waterrune" to 1000, "obj.earthrune" to 1000,
        "obj.chaosrune" to 300, "obj.deathrune" to 300, "obj.naturerune" to 200,
    )
    private val supplies = mapOf(
        "obj.4dose2attack" to 1, "obj.4dose2strength" to 1,
        "obj.4doseprayerrestore" to 1, "obj.4dose2restore" to 1,
        "obj.4dosepotionofsaradomin" to 1, "obj.tbwt_cooked_karambwan" to 3,
        "obj.poh_tablet_lumbridgeteleport" to 1,
    )
    private val mageSupplies = mapOf(
        "obj.4doseprayerrestore" to 2, "obj.tbwt_cooked_karambwan" to 3,
        "obj.poh_tablet_lumbridgeteleport" to 1,
    )

    private fun member(
        id: String,
        levels: Map<String, Int>,
        styles: Map<BotPvpStyle, List<String>>,
        primary: BotPvpStyle,
        special: List<String> = listOf("obj.dragon_dagger", "obj.granite_maul"),
        book: Spellbook = Spellbook.Standard,
        attackSpell: String? = null,
        freezeSpell: String? = null,
        vengeance: Boolean = false,
        runes: Map<String, Int> = emptyMap(),
        consumables: Map<String, Int> = supplies,
    ) = BotPvpLoadout(
        id, true, levels, styles, primary, special, book, attackSpell,
        freezeSpell, vengeance, "obj.shark", consumables, runes,
    )

    /**
     * Eighteen native SoloScape equipment templates expand into all 89 TSPS archetypes. The
     * archetype keeps its exact TSPS stats/profile/weight/spellbook while equipment is expressed
     * through verified native gameval primitives so every generated switch can be equipped.
     */
    private val templates: List<BotPvpLoadout> = listOf(
        member(
            "pure", levels(attack = 60, defence = 1, prayer = 52),
            mapOf(BotPvpStyle.Melee to pureMelee, BotPvpStyle.Ranged to pureRanged),
            BotPvpStyle.Ranged,
        ),
        member(
            "zerker", levels(attack = 75, defence = 45, prayer = 52),
            mapOf(BotPvpStyle.Melee to melee, BotPvpStyle.Ranged to ranged),
            BotPvpStyle.Melee, special = listOf("obj.ags", "obj.dragon_dagger"),
        ),
        member(
            "tank", levels(attack = 60, strength = 60),
            mapOf(BotPvpStyle.Ranged to ranged), BotPvpStyle.Ranged,
            special = listOf("obj.darkbow", "obj.magic_shortbow"),
        ),
        member(
            "main", levels(), mapOf(BotPvpStyle.Melee to melee), BotPvpStyle.Melee,
            special = listOf("obj.ags", "obj.dragon_claws", "obj.bgs"),
        ),
        member(
            "ranged", levels(defence = 40, attack = 60, prayer = 52),
            mapOf(BotPvpStyle.Ranged to ranged, BotPvpStyle.Melee to pureMelee),
            BotPvpStyle.Ranged,
        ),
        member(
            "venge", levels(), mapOf(BotPvpStyle.Melee to melee, BotPvpStyle.Ranged to ranged),
            BotPvpStyle.Melee, special = listOf("obj.ags", "obj.dragon_claws"),
            book = Spellbook.Lunars, vengeance = true, runes = lunarRunes,
        ),
        member(
            "hybrid", levels(), mapOf(BotPvpStyle.Magic to magic, BotPvpStyle.Melee to melee),
            BotPvpStyle.Magic, book = Spellbook.Ancients,
            attackSpell = "Ice barrage", freezeSpell = "Ice barrage", runes = ancientRunes,
        ),
        member(
            "tribrid", levels(),
            mapOf(
                BotPvpStyle.Magic to magic,
                BotPvpStyle.Melee to listOf("obj.abyssal_whip", "obj.rune_chainbody", "obj.rune_platelegs"),
                BotPvpStyle.Ranged to listOf("obj.magic_shortbow", "obj.rune_arrow", "obj.black_dragonhide_body", "obj.black_dragonhide_chaps"),
            ),
            BotPvpStyle.Magic, book = Spellbook.Ancients,
            attackSpell = "Ice barrage", freezeSpell = "Ice barrage", runes = ancientRunes,
        ),
        member(
            "nh_pure", levels(attack = 60, defence = 1, prayer = 52),
            mapOf(BotPvpStyle.Magic to pureMagic, BotPvpStyle.Melee to pureMelee, BotPvpStyle.Ranged to pureRanged),
            BotPvpStyle.Magic, book = Spellbook.Ancients,
            attackSpell = "Ice barrage", freezeSpell = "Ice barrage", runes = ancientRunes,
        ),
        member(
            "standard_hybrid", levels(),
            mapOf(
                BotPvpStyle.Magic to listOf("obj.staff_of_fire", "obj.mystic_robe_top", "obj.mystic_robe_bottom", "obj.amulet_of_glory"),
                BotPvpStyle.Melee to listOf("obj.abyssal_whip", "obj.rune_chainbody", "obj.rune_platelegs"),
                BotPvpStyle.Ranged to listOf("obj.magic_shortbow", "obj.rune_arrow", "obj.black_dragonhide_body", "obj.black_dragonhide_chaps"),
            ),
            BotPvpStyle.Magic, attackSpell = "Fire wave", freezeSpell = "Entangle",
            runes = standardRunes, consumables = mageSupplies,
        ),
        BotPvpLoadout(
            "f2p", false, levels(attack = 40, defence = 40, prayer = 45),
            mapOf(BotPvpStyle.Melee to f2pMelee, BotPvpStyle.Ranged to f2pRanged),
            BotPvpStyle.Melee, emptyList(), Spellbook.Standard,
            null, null, false, "obj.swordfish", emptyMap(), emptyMap(),
        ),
    ).let { base ->
        val main = base.first { it.id == "main" }
        val pure = base.first { it.id == "pure" }
        val standard = base.first { it.id == "standard_hybrid" }
        val f2p = base.first { it.id == "f2p" }
        base + listOf(
            main.copy(id = "main_claws", specialWeapons = listOf("obj.dragon_claws")),
            main.copy(id = "main_bgs", specialWeapons = listOf("obj.bgs")),
            pure.copy(
                id = "pure_mauler", levels = levels(attack = 50, defence = 1, prayer = 52),
                styles = pure.styles + (BotPvpStyle.Melee to listOf("obj.granite_maul", "obj.amulet_of_glory", "obj.death_climbingboots")),
                specialWeapons = listOf("obj.granite_maul", "obj.magic_shortbow"),
            ),
            standard.copy(
                id = "standard_mage", primaryStyle = BotPvpStyle.Magic,
                styles = mapOf(BotPvpStyle.Magic to standard.styles.getValue(BotPvpStyle.Magic)),
                specialWeapons = emptyList(), attackSpell = "Fire blast", freezeSpell = "Bind",
            ),
            standard.copy(
                id = "standard_snare", primaryStyle = BotPvpStyle.Magic,
                styles = mapOf(BotPvpStyle.Magic to standard.styles.getValue(BotPvpStyle.Magic)),
                specialWeapons = emptyList(), attackSpell = "Fire blast", freezeSpell = "Snare",
            ),
            f2p.copy(
                id = "f2p_ranged_ko", primaryStyle = BotPvpStyle.Ranged,
                styles = f2p.styles + (BotPvpStyle.Melee to f2pKo),
            ),
            f2p.copy(
                id = "f2p_pure", levels = levels(attack = 40, defence = 1, prayer = 45),
                primaryStyle = BotPvpStyle.Ranged,
                styles = mapOf(BotPvpStyle.Melee to f2pKo, BotPvpStyle.Ranged to f2pRanged),
            ),
        )
    }

    internal val nativeTemplateCount: Int get() = templates.size
    private val templateById = templates.associateBy { it.id }

    private val ancientVariants = setOf(
        "low_level_nh_pure", "med_tribrid_ags", "spear_tribrid_ags", "sotd_hybrid_claws",
        "toxic_sotd_hybrid", "ancients_hybrid", "elite_ancients_dbow", "tribrid_main",
        "nh_pure", "elite_nh_ags", "elite_nh_claws", "volatile_nh", "budget_nh_dds",
        "budget_nh_ags", "anti_pk_rcb", "anti_pk_whip", "budget_anti_pk",
        "budget_max_tribrid", "budget_zerker_tribrid", "budget_med_tribrid",
        "budget_pure_tribrid", "budget_gmaul_tribrid", "budget_range_tank",
        "budget_ancient_msb_dds", "rune_pure_nh_anchor", "med_nh_anchor", "dwh_zerker_nh",
    )
    private val lunarVariants = setOf(
        "void_pure_claws", "void_pure_ballista", "mid_tank_whip_ags", "main_whip",
        "full_dharok", "zerker_whip", "zerker_dscim", "zerker_venge_ags",
        "ancient_gs_venge", "zerker_whip_claws", "med_whip_ags", "karils_venge_ags",
        "veracs_venge_claws", "blowpipe_venge_ags", "dhalberd_venge_ags",
        "void_melee_claws", "void_melee_ags", "budget_venge_dscim_rcb",
        "budget_venge_msb_gmaul", "budget_lunar_ranged_tank", "ags_zerker",
    )
    private val attackSpells = mapOf(
        "low_level_nh_pure" to "Ice blitz",
        "f2p_bind_blast" to "Fire blast", "f2p_bind_maple" to "Fire bolt",
        "f2p_fire_blast_pure" to "Fire blast", "f2p_wind_blast_pure" to "Wind blast",
        "f2p_bind_r2h" to "Fire blast", "f2p_bind_rbaxe" to "Fire bolt",
        "med_tribrid_ags" to "Ice barrage", "spear_tribrid_ags" to "Ice barrage",
        "sotd_hybrid_claws" to "Ice barrage", "toxic_sotd_hybrid" to "Ice barrage",
        "ancients_hybrid" to "Ice barrage", "elite_ancients_dbow" to "Ice barrage",
        "tribrid_main" to "Ice barrage", "nh_pure" to "Ice barrage",
        "elite_nh_ags" to "Ice barrage", "elite_nh_claws" to "Ice barrage",
        "volatile_nh" to "Ice barrage", "budget_nh_dds" to "Ice blitz",
        "budget_nh_ags" to "Ice blitz", "anti_pk_rcb" to "Ice barrage",
        "anti_pk_whip" to "Ice barrage", "budget_anti_pk" to "Ice barrage",
        "budget_max_tribrid" to "Ice blitz", "budget_zerker_tribrid" to "Ice blitz",
        "budget_med_tribrid" to "Ice blitz", "budget_pure_tribrid" to "Ice blitz",
        "budget_gmaul_tribrid" to "Ice blitz", "budget_range_tank" to "Ice blitz",
        "budget_ancient_msb_dds" to "Ice blitz", "rune_pure_nh_anchor" to "Ice blitz",
        "med_nh_anchor" to "Ice blitz", "dwh_zerker_nh" to "Ice blitz",
    )

    private fun specialsFor(id: String, base: BotPvpLoadout): List<String> = when {
        id.startsWith("f2p_") || id == "full_dharok" || id == "obby_rusher" -> emptyList()
        "gmaul" in id -> listOf("obj.granite_maul")
        "claws" in id -> listOf("obj.dragon_claws")
        "dark_bow" in id || "dbow" in id -> listOf("obj.darkbow")
        "ags" in id || id == "ancient_gs_venge" || id == "ags_zerker" -> listOf("obj.ags")
        "dds" in id -> listOf("obj.dragon_dagger")
        id == "obby_mauler" || id == "obsidian_set_mauler" -> listOf("obj.dragon_claws")
        else -> base.specialWeapons
    }

    private fun nativeVariant(definition: BotPvpVariantDefinition): BotPvpLoadout {
        val templateId = when (definition.template) {
            "f2p_magic", "f2p_bind_ko" -> "f2p_pure"
            else -> definition.template
        }
        val base = checkNotNull(templateById[templateId]) {
            "Unknown TSPS native template ${definition.template} for ${definition.id}"
        }
        val id = definition.id
        val book = when (id) {
            in ancientVariants -> Spellbook.Ancients
            in lunarVariants -> Spellbook.Lunars
            else -> Spellbook.Standard
        }
        val exact = exactLevels(id)
        val f2pMageOnly = id in setOf("f2p_bind_blast", "f2p_fire_blast_pure", "f2p_wind_blast_pure")
        val f2pMageRange = id == "f2p_bind_maple"
        val f2pMageMelee = id == "f2p_bind_r2h" || id == "f2p_bind_rbaxe"
        val styles = when {
            f2pMageOnly -> mapOf(BotPvpStyle.Magic to f2pMagic)
            f2pMageRange -> mapOf(BotPvpStyle.Magic to f2pMagic, BotPvpStyle.Ranged to f2pRanged)
            f2pMageMelee -> mapOf(BotPvpStyle.Magic to f2pMagic, BotPvpStyle.Melee to f2pKo)
            book == Spellbook.Ancients && BotPvpStyle.Magic !in base.styles ->
                base.styles + (BotPvpStyle.Magic to magic)
            else -> base.styles
        }
        val primary = when {
            f2pMageOnly || f2pMageRange || f2pMageMelee -> BotPvpStyle.Magic
            book == Spellbook.Ancients && BotPvpStyle.Magic in styles -> BotPvpStyle.Magic
            else -> base.primaryStyle
        }
        val attackSpell = attackSpells[id]
        val freezeSpell = when {
            id.startsWith("f2p_bind_") -> "Bind"
            book == Spellbook.Ancients -> attackSpell
            else -> null
        }
        val hasIceBarrage = book == Spellbook.Ancients &&
            exact.getValue("stat.magic") >= 94
        val runePacks = if (hasIceBarrage) {
            mapOf(BLIGHTED_ANCIENT_ICE_SACK_ID to BLIGHTED_ANCIENT_ICE_SACK_COUNT)
        } else {
            emptyMap()
        }
        val runes = when {
            id.startsWith("f2p_") && attackSpell != null -> f2pMagicRunes
            book == Spellbook.Ancients && !hasIceBarrage -> ancientRunes
            book == Spellbook.Lunars -> lunarRunes
            else -> emptyMap()
        }
        return base.copy(
            id = id,
            members = !definition.f2p,
            levels = exact,
            styles = styles,
            primaryStyle = primary,
            specialWeapons = specialsFor(id, base),
            spellbook = book,
            attackSpell = attackSpell,
            freezeSpell = freezeSpell,
            vengeance = book == Spellbook.Lunars,
            food = if (definition.f2p) "obj.swordfish" else "obj.shark",
            consumables = if (definition.f2p) emptyMap() else base.consumables,
            runes = runes,
            runePacks = runePacks,
        )
    }

    /** Exactly the 89 weighted TSPS archetypes at the pinned source revision. */
    val all: List<BotPvpLoadout> = BotPvpTspsCatalog.variants.map(::nativeVariant)
    private val byId = all.associateBy { it.id }

    fun get(id: String): BotPvpLoadout? = byId[id.lowercase()]

    /** TSPS uses F2P-only loadouts on free worlds and non-F2P variants on members worlds. */
    fun available(members: Boolean): List<BotPvpLoadout> =
        all.filter { if (members) it.members else !it.members }

    fun allowedAt(loadoutId: String, hotspotId: String?): Boolean {
        val hotspot = BotPvpHotspots.get(hotspotId) ?: return true
        val loadout = get(loadoutId) ?: return false
        return BotPvpTspsCatalog.familyIdsForVariant(loadoutId)
            .any { it in hotspot.families(loadout.members) }
    }

    private fun effectiveWeight(
        definition: BotPvpVariantDefinition,
        hotspot: BotPvpHotspot?,
    ): Int {
        val style = byId[definition.id]?.primaryStyle
        val styleWeight = style?.let { hotspot?.styleWeights?.get(it) } ?: 1.0
        return (definition.weight.coerceAtLeast(1) * styleWeight * 1000.0)
            .roundToInt().coerceAtLeast(1)
    }

    fun choose(
        identity: Int,
        members: Boolean,
        difficulty: BotPvpDifficulty = BotPvpDifficulty.Standard,
        hotspotId: String? = null,
    ): BotPvpLoadout {
        val hotspot = BotPvpHotspots.get(hotspotId)
        val familyVariants = hotspot?.families(members)?.let(BotPvpTspsCatalog::variantsForFamilies)
        var definitions = BotPvpTspsCatalog.variants.filter { definition ->
            (if (members) !definition.f2p else definition.f2p) &&
                definition.minimumDifficulty.ordinal <= difficulty.ordinal &&
                (familyVariants == null || definition.id in familyVariants)
        }
        if (definitions.isEmpty()) {
            definitions = BotPvpTspsCatalog.variants.filter { definition ->
                (if (members) !definition.f2p else definition.f2p) &&
                    definition.minimumDifficulty.ordinal <= difficulty.ordinal
            }
        }
        check(definitions.isNotEmpty()) { "No TSPS PvP variants for $difficulty members=$members" }
        val weighted = definitions.map { it to effectiveWeight(it, hotspot) }
        val total = weighted.sumOf { it.second }
        val salt = hotspotId?.hashCode() ?: 0
        var roll = Math.floorMod(identity * 1103515245 + salt, total)
        for ((definition, weight) in weighted) {
            roll -= weight
            if (roll < 0) return checkNotNull(byId[definition.id])
        }
        return checkNotNull(byId[weighted.last().first.id])
    }
}
