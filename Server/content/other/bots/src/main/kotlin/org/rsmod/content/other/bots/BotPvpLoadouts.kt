package org.rsmod.content.other.bots

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
)

object BotPvpLoadouts {
    private fun levels(
        attack: Int = 99, defence: Int = 99, strength: Int = 99,
        hitpoints: Int = 99, ranged: Int = 99, magic: Int = 99, prayer: Int = 99,
    ): Map<String, Int> = mapOf(
        "stat.attack" to attack, "stat.defence" to defence, "stat.strength" to strength,
        "stat.hitpoints" to hitpoints, "stat.ranged" to ranged, "stat.magic" to magic,
        "stat.prayer" to prayer,
    )

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
        "obj.airrune" to 1000, "obj.deathrune" to 300, "obj.naturerune" to 200,
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
     * Small native equipment primitives. TSPS has 89 archetypes but many differ only in a switch,
     * finisher, stat line or spellbook; sharing primitives keeps every referenced gameval valid.
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
            BotPvpLoadout(
                "f2p_magic", false, levels(attack = 1, defence = 1, strength = 60, hitpoints = 76, ranged = 82, magic = 75, prayer = 1),
                mapOf(BotPvpStyle.Magic to f2pMagic, BotPvpStyle.Ranged to f2pRanged),
                BotPvpStyle.Magic, emptyList(), Spellbook.Standard,
                "Fire blast", "Bind", false, "obj.swordfish", emptyMap(), f2pMagicRunes,
            ),
            BotPvpLoadout(
                "f2p_bind_ko", false, levels(attack = 40, defence = 1, strength = 75, hitpoints = 78, ranged = 1, magic = 79, prayer = 1),
                mapOf(BotPvpStyle.Magic to f2pMagic, BotPvpStyle.Melee to f2pKo),
                BotPvpStyle.Magic, emptyList(), Spellbook.Standard,
                "Fire blast", "Bind", false, "obj.swordfish", emptyMap(), f2pMagicRunes,
            ),
        )
    }

    private val templateById = templates.associateBy { it.id }

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
        val base = checkNotNull(templateById[definition.template]) {
            "Unknown TSPS native template ${definition.template} for ${definition.id}"
        }
        val id = definition.id
        val ancient = !id.startsWith("f2p_") && (
            "nh" in id || "tribrid" in id || id == "ancients_hybrid" ||
                id == "elite_ancients_dbow" || id.startsWith("anti_pk_") ||
                id == "toxic_sotd_hybrid" || id == "sotd_hybrid_claws" ||
                id == "spear_tribrid_ags" || id == "volatile_nh"
            )
        val lunar = !ancient && ("venge" in id || "lunar" in id || base.vengeance)
        val styles = when {
            id.startsWith("f2p_") -> base.styles
            ancient && BotPvpStyle.Magic !in base.styles -> base.styles + (BotPvpStyle.Magic to magic)
            else -> base.styles
        }
        val book = when {
            ancient -> Spellbook.Ancients
            lunar -> Spellbook.Lunars
            else -> base.spellbook
        }
        val attackSpell = when {
            id.startsWith("f2p_fire_blast") || id.startsWith("f2p_bind") -> "Fire blast"
            id.startsWith("f2p_wind_blast") -> "Wind blast"
            ancient && ("budget" in id || "low_level" in id || "rune_pure_nh" in id || "med_nh" in id) -> "Ice blitz"
            ancient -> "Ice barrage"
            else -> base.attackSpell
        }
        val freezeSpell = when {
            id.startsWith("f2p_bind") -> "Bind"
            ancient -> attackSpell
            else -> base.freezeSpell
        }
        val runes = when {
            id.startsWith("f2p_") && attackSpell != null -> f2pMagicRunes
            ancient -> ancientRunes
            lunar -> lunarRunes
            else -> base.runes
        }
        return base.copy(
            id = id,
            members = !definition.f2p,
            styles = styles,
            primaryStyle = if (ancient && BotPvpStyle.Magic in styles) BotPvpStyle.Magic else base.primaryStyle,
            specialWeapons = specialsFor(id, base),
            spellbook = book,
            attackSpell = attackSpell,
            freezeSpell = freezeSpell,
            vengeance = lunar,
            food = if (definition.f2p) "obj.swordfish" else base.food,
            consumables = if (definition.f2p) emptyMap() else base.consumables,
            runes = runes,
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
        return BotPvpTspsCatalog.familyIdsForVariant(loadoutId).any { it in hotspot.families(get(loadoutId)?.members == true) }
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
        val total = definitions.sumOf { it.weight.coerceAtLeast(1) }
        val salt = hotspotId?.hashCode() ?: 0
        var roll = Math.floorMod(identity * 1103515245 + salt, total)
        for (definition in definitions) {
            roll -= definition.weight.coerceAtLeast(1)
            if (roll < 0) return checkNotNull(byId[definition.id])
        }
        return checkNotNull(byId[definitions.last().id])
    }
}
