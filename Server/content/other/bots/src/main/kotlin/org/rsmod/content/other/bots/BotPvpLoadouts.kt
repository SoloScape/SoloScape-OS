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
    private val ancientRunes = mapOf(
        "obj.waterrune" to 1000, "obj.deathrune" to 400, "obj.bloodrune" to 400,
    )
    private val lunarRunes = mapOf(
        "obj.astralrune" to 200, "obj.deathrune" to 200, "obj.earthrune" to 1000,
    )
    private val supplies = mapOf(
        "obj.4dose2attack" to 1, "obj.4dose2strength" to 1,
        "obj.4doseprayerrestore" to 1, "obj.4dose2restore" to 1,
        "obj.4dosebrew" to 1, "obj.cooked_karambwan" to 3,
        "obj.poh_tablet_lumbridgeteleport" to 1,
    )
    private val mageSupplies = mapOf(
        "obj.4doseprayerrestore" to 2, "obj.cooked_karambwan" to 3,
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

    val all: List<BotPvpLoadout> = listOf(
        member(
            "pure", levels(attack = 60, defence = 1, prayer = 52),
            mapOf(BotPvpStyle.Melee to pureMelee, BotPvpStyle.Ranged to pureRanged),
            BotPvpStyle.Ranged,
        ),
        member(
            "zerker", levels(attack = 75, defence = 45, prayer = 52),
            mapOf(
                BotPvpStyle.Melee to melee,
                BotPvpStyle.Ranged to ranged,
            ),
            BotPvpStyle.Melee, special = listOf("obj.ags", "obj.dragon_dagger"),
        ),
        member(
            "tank", levels(attack = 60, strength = 60),
            mapOf(BotPvpStyle.Ranged to ranged),
            BotPvpStyle.Ranged, special = listOf("obj.darkbow", "obj.magic_shortbow"),
        ),
        member(
            "main", levels(), mapOf(BotPvpStyle.Melee to melee),
            BotPvpStyle.Melee, special = listOf("obj.ags", "obj.dragon_claws", "obj.bgs"),
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
            "hybrid", levels(),
            mapOf(BotPvpStyle.Magic to magic, BotPvpStyle.Melee to melee),
            BotPvpStyle.Magic, book = Spellbook.Ancients,
            attackSpell = "Ice barrage", freezeSpell = "Ice barrage", runes = ancientRunes,
        ),
        member(
            "tribrid", levels(),
            mapOf(
                BotPvpStyle.Magic to magic,
                BotPvpStyle.Melee to listOf("obj.abyssal_whip", "obj.rune_chainbody",
                    "obj.rune_platelegs"),
                BotPvpStyle.Ranged to listOf("obj.magic_shortbow", "obj.rune_arrow",
                    "obj.black_dragonhide_body", "obj.black_dragonhide_chaps"),
            ),
            BotPvpStyle.Magic, book = Spellbook.Ancients,
            attackSpell = "Ice barrage", freezeSpell = "Ice barrage", runes = ancientRunes,
        ),
        member(
            "nh_pure", levels(attack = 60, defence = 1, prayer = 52),
            mapOf(
                BotPvpStyle.Magic to pureMagic,
                BotPvpStyle.Melee to pureMelee,
                BotPvpStyle.Ranged to pureRanged,
            ),
            BotPvpStyle.Magic, book = Spellbook.Ancients,
            attackSpell = "Ice barrage", freezeSpell = "Ice barrage", runes = ancientRunes,
        ),
        member(
            "standard_hybrid", levels(),
            mapOf(
                BotPvpStyle.Magic to listOf("obj.staff_of_fire", "obj.mystic_robe_top",
                    "obj.mystic_robe_bottom", "obj.amulet_of_glory"),
                BotPvpStyle.Melee to listOf("obj.abyssal_whip", "obj.rune_chainbody",
                    "obj.rune_platelegs"),
                BotPvpStyle.Ranged to listOf("obj.magic_shortbow", "obj.rune_arrow",
                    "obj.black_dragonhide_body", "obj.black_dragonhide_chaps"),
            ),
            BotPvpStyle.Magic, attackSpell = "Fire wave", freezeSpell = "Entangle",
            runes = mapOf(
                "obj.airrune" to 1000, "obj.bloodrune" to 300,
                "obj.naturerune" to 300, "obj.earthrune" to 1000, "obj.waterrune" to 1000,
                "obj.chaosrune" to 300, "obj.lawrune" to 300, "obj.deathrune" to 300,
            ),
            consumables = mapOf(
                "obj.4doseprayerrestore" to 1, "obj.cooked_karambwan" to 2,
                "obj.poh_tablet_lumbridgeteleport" to 1,
            ),
        ),
        BotPvpLoadout(
            "f2p", false, levels(attack = 40, defence = 40, prayer = 45),
            mapOf(
                BotPvpStyle.Melee to listOf(
                    "obj.rune_scimitar", "obj.rune_full_helm", "obj.rune_chainbody",
                    "obj.rune_platelegs", "obj.rune_kiteshield", "obj.amulet_of_strength",
                ),
                BotPvpStyle.Ranged to listOf(
                    "obj.maple_shortbow", "obj.adamant_arrow", "obj.leather_armour",
                    "obj.dragonhide_chaps", "obj.dragon_vambraces", "obj.coif",
                ),
            ),
            BotPvpStyle.Melee, emptyList(), Spellbook.Standard,
            null, null, false, "obj.swordfish", emptyMap(), emptyMap(),
        ),
    ).let { presets ->
        val main = presets.first { it.id == "main" }
        val pure = presets.first { it.id == "pure" }
        val standard = presets.first { it.id == "standard_hybrid" }
        val f2p = presets.first { it.id == "f2p" }
        presets + listOf(
            main.copy(id = "main_claws", specialWeapons = listOf("obj.dragon_claws")),
            main.copy(id = "main_bgs", specialWeapons = listOf("obj.bgs")),
            pure.copy(
                id = "pure_mauler", levels = levels(attack = 50, defence = 1, prayer = 52),
                styles = pure.styles + (BotPvpStyle.Melee to
                    listOf("obj.granite_maul", "obj.amulet_of_glory", "obj.death_climbingboots")),
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
                styles = f2p.styles + (BotPvpStyle.Melee to listOf(
                    "obj.rune_2h_sword", "obj.rune_full_helm", "obj.rune_chainbody",
                    "obj.rune_platelegs", "obj.amulet_of_strength",
                )),
            ),
            f2p.copy(
                id = "f2p_pure", levels = levels(attack = 40, defence = 1, prayer = 45),
                primaryStyle = BotPvpStyle.Ranged,
                styles = mapOf(
                    BotPvpStyle.Melee to listOf("obj.rune_2h_sword", "obj.amulet_of_strength"),
                    BotPvpStyle.Ranged to listOf("obj.maple_shortbow", "obj.adamant_arrow",
                        "obj.leather_armour", "obj.dragonhide_chaps", "obj.dragon_vambraces"),
                ),
            ),
        )
    }

    fun get(id: String): BotPvpLoadout? = all.firstOrNull { it.id.equals(id, true) }

    fun available(members: Boolean): List<BotPvpLoadout> = all.filter { members || !it.members }

    fun choose(identity: Int, members: Boolean): BotPvpLoadout {
        val choices = available(members)
        return choices[Math.floorMod(identity - 1, choices.size)]
    }
}
