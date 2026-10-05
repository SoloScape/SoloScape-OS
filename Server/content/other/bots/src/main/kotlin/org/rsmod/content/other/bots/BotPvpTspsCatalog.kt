package org.rsmod.content.other.bots

/**
 * PvP archetype and family metadata pinned to RSPSApp/tsps
 * c40e57fd95c8edb400ded74e1dde9fe87c3e8d7e.
 *
 * Gear is resolved to native SoloScape templates in [BotPvpLoadouts]; this table keeps the exact
 * TSPS archetype ids, weights, profile gates and family membership so assignment stays faithful
 * without depending on the legacy TypeScript runtime.
 */
data class BotPvpVariantDefinition(
    val id: String,
    val weight: Int,
    val template: String,
    val minimumDifficulty: BotPvpDifficulty = BotPvpDifficulty.Novice,
) {
    val f2p: Boolean get() = id.startsWith("f2p_")
}

object BotPvpTspsCatalog {
    private fun d(
        id: String,
        weight: Int,
        template: String,
        minimum: BotPvpDifficulty = BotPvpDifficulty.Novice,
    ) = BotPvpVariantDefinition(id, weight, template, minimum)

    val variants: List<BotPvpVariantDefinition> = listOf(
        d("initiate_dscim_dds", 8, "pure"),
        d("initiate_dscim_gmaul", 8, "pure_mauler"),
        d("initiate_msb_gmaul", 12, "pure_mauler"),
        d("low_level_dds_pure", 6, "pure"),
        d("low_level_gmaul_pure", 18, "pure_mauler"),
        d("dwh_pure", 8, "pure", BotPvpDifficulty.Veteran),
        d("rune_pure_dscim_dds", 6, "ranged"),
        d("rune_pure_msb_ags", 9, "ranged", BotPvpDifficulty.Veteran),
        d("void_pure_claws", 8, "ranged", BotPvpDifficulty.Veteran),
        d("void_pure_ballista", 6, "ranged", BotPvpDifficulty.Elite),
        d("low_level_nh_pure", 10, "nh_pure"),
        d("mid_tank_whip_ags", 9, "venge", BotPvpDifficulty.Standard),
        d("mid_tank_dcb_ags", 8, "venge", BotPvpDifficulty.Standard),
        d("f2p_rwh_pure", 18, "f2p_pure"),
        d("f2p_rbaxe_pure", 14, "f2p_pure"),
        d("f2p_rscim_r2h", 18, "f2p"),
        d("f2p_rscim_rbaxe", 14, "f2p"),
        d("f2p_maple_r2h", 18, "f2p_ranged_ko"),
        d("f2p_maple_rbaxe", 14, "f2p_ranged_ko"),
        d("f2p_bind_blast", 10, "f2p_magic"),
        d("f2p_bind_maple", 8, "f2p_magic"),
        d("f2p_addy_r2h_tank", 16, "f2p"),
        d("f2p_addy_rbaxe_tank", 14, "f2p"),
        d("f2p_fire_blast_pure", 8, "f2p_magic"),
        d("f2p_wind_blast_pure", 6, "f2p_magic"),
        d("f2p_bind_r2h", 8, "f2p_bind_ko"),
        d("f2p_bind_rbaxe", 7, "f2p_bind_ko"),
        d("main_whip", 30, "main"),
        d("full_dharok", 12, "main"),
        d("zerker_whip", 24, "zerker"),
        d("zerker_dscim", 10, "zerker"),
        d("zerker_venge_ags", 14, "venge"),
        d("ancient_gs_venge", 9, "venge", BotPvpDifficulty.Veteran),
        d("zerker_dcb_ags", 10, "venge", BotPvpDifficulty.Standard),
        d("zerker_whip_claws", 8, "venge", BotPvpDifficulty.Veteran),
        d("med_whip_ags", 8, "venge", BotPvpDifficulty.Veteran),
        d("med_dcb_claws", 7, "venge", BotPvpDifficulty.Veteran),
        d("med_tribrid_ags", 6, "tribrid", BotPvpDifficulty.Veteran),
        d("karils_venge_ags", 9, "venge", BotPvpDifficulty.Standard),
        d("veracs_venge_claws", 8, "venge", BotPvpDifficulty.Veteran),
        d("blowpipe_venge_ags", 6, "venge", BotPvpDifficulty.Veteran),
        d("dhalberd_venge_ags", 6, "venge", BotPvpDifficulty.Veteran),
        d("spear_tribrid_ags", 7, "tribrid", BotPvpDifficulty.Veteran),
        d("sotd_hybrid_claws", 5, "tribrid", BotPvpDifficulty.Elite),
        d("toxic_sotd_hybrid", 6, "tribrid", BotPvpDifficulty.Veteran),
        d("msb_gmaul", 24, "pure_mauler"),
        d("rcb_dds", 24, "ranged"),
        d("msb_dds", 18, "ranged"),
        d("dark_bow_ags", 8, "ranged", BotPvpDifficulty.Elite),
        d("void_dcb_claws", 8, "ranged", BotPvpDifficulty.Veteran),
        d("void_dcb_ags", 7, "ranged", BotPvpDifficulty.Veteran),
        d("void_ballista_ags", 4, "ranged", BotPvpDifficulty.Elite),
        d("void_melee_claws", 6, "venge", BotPvpDifficulty.Veteran),
        d("void_melee_ags", 5, "venge", BotPvpDifficulty.Veteran),
        d("ancients_hybrid", 28, "hybrid"),
        d("elite_ancients_dbow", 12, "hybrid", BotPvpDifficulty.Elite),
        d("tribrid_main", 22, "tribrid"),
        d("nh_pure", 14, "nh_pure"),
        d("elite_nh_ags", 10, "tribrid", BotPvpDifficulty.Elite),
        d("elite_nh_claws", 9, "tribrid", BotPvpDifficulty.Elite),
        d("volatile_nh", 5, "tribrid", BotPvpDifficulty.Elite),
        d("budget_nh_dds", 10, "standard_hybrid"),
        d("budget_nh_ags", 8, "standard_hybrid", BotPvpDifficulty.Veteran),
        d("anti_pk_rcb", 24, "tribrid"),
        d("anti_pk_whip", 22, "tribrid"),
        d("budget_anti_pk", 14, "standard_hybrid"),
        d("budget_scim", 14, "zerker"),
        d("budget_rcb", 20, "ranged"),
        d("budget_msb", 18, "ranged"),
        d("budget_max_tribrid", 8, "tribrid", BotPvpDifficulty.Veteran),
        d("budget_zerker_tribrid", 8, "tribrid", BotPvpDifficulty.Veteran),
        d("budget_med_tribrid", 5, "tribrid", BotPvpDifficulty.Veteran),
        d("budget_pure_tribrid", 5, "nh_pure", BotPvpDifficulty.Veteran),
        d("budget_gmaul_tribrid", 8, "nh_pure", BotPvpDifficulty.Veteran),
        d("budget_range_tank", 8, "tribrid", BotPvpDifficulty.Veteran),
        d("budget_venge_dscim_rcb", 4, "venge", BotPvpDifficulty.Veteran),
        d("budget_venge_msb_gmaul", 6, "venge", BotPvpDifficulty.Veteran),
        d("budget_ancient_msb_dds", 6, "nh_pure", BotPvpDifficulty.Veteran),
        d("rune_pure_nh_anchor", 4, "nh_pure", BotPvpDifficulty.Veteran),
        d("med_nh_anchor", 5, "tribrid", BotPvpDifficulty.Veteran),
        d("budget_lunar_ranged_tank", 5, "venge", BotPvpDifficulty.Veteran),
        d("dwh_zerker_nh", 3, "tribrid", BotPvpDifficulty.Elite),
        d("ags_zerker", 12, "zerker", BotPvpDifficulty.Veteran),
        d("obby_mauler", 10, "pure_mauler", BotPvpDifficulty.Veteran),
        d("obsidian_set_mauler", 7, "main_claws", BotPvpDifficulty.Veteran),
        d("ballista_pure", 10, "ranged", BotPvpDifficulty.Veteran),
        d("gmaul_rusher", 26, "pure_mauler"),
        d("dds_rusher", 12, "pure"),
        d("obby_rusher", 14, "pure_mauler"),
    )

    val families: Map<String, List<String>> = mapOf(
        "edge_main_melee" to listOf("main_whip", "zerker_whip", "zerker_dscim", "ags_zerker", "ancient_gs_venge", "zerker_venge_ags", "zerker_whip_claws", "med_whip_ags", "full_dharok", "veracs_venge_claws", "obsidian_set_mauler", "dhalberd_venge_ags"),
        "edge_ranged_melee" to listOf("msb_gmaul", "rcb_dds", "msb_dds", "dark_bow_ags", "zerker_dcb_ags", "med_dcb_claws", "void_dcb_claws", "void_dcb_ags", "void_ballista_ags", "ballista_pure", "karils_venge_ags", "blowpipe_venge_ags", "budget_nh_dds", "budget_max_tribrid", "budget_range_tank", "budget_ancient_msb_dds", "budget_lunar_ranged_tank", "rune_pure_nh_anchor", "med_nh_anchor"),
        "deep_wild_hybrid" to listOf("ancients_hybrid", "elite_ancients_dbow", "tribrid_main", "elite_nh_ags", "elite_nh_claws", "volatile_nh", "med_tribrid_ags", "nh_pure", "budget_nh_dds", "budget_nh_ags", "toxic_sotd_hybrid", "spear_tribrid_ags", "sotd_hybrid_claws"),
        "anti_pk_hybrid" to listOf("anti_pk_rcb", "anti_pk_whip", "budget_anti_pk", "budget_nh_dds", "med_tribrid_ags", "toxic_sotd_hybrid"),
        "budget_pk" to listOf("budget_scim", "budget_rcb", "budget_msb", "budget_max_tribrid", "budget_zerker_tribrid", "budget_med_tribrid", "budget_pure_tribrid", "budget_gmaul_tribrid", "budget_range_tank", "budget_venge_dscim_rcb", "budget_venge_msb_gmaul", "budget_ancient_msb_dds", "budget_lunar_ranged_tank"),
        "initiate_pure" to listOf("initiate_dscim_dds", "initiate_dscim_gmaul", "initiate_msb_gmaul"),
        "low_level_pure" to listOf("low_level_dds_pure", "low_level_gmaul_pure", "dwh_pure", "msb_gmaul", "msb_dds"),
        "rune_pure_members" to listOf("rune_pure_dscim_dds", "rune_pure_msb_ags", "rune_pure_nh_anchor", "initiate_dscim_dds", "initiate_msb_gmaul"),
        "void_pure" to listOf("void_pure_claws", "void_pure_ballista", "ballista_pure"),
        "f2p_strength_pure" to listOf("f2p_rwh_pure", "f2p_rbaxe_pure"),
        "f2p_rune_pure" to listOf("f2p_rscim_r2h", "f2p_rscim_rbaxe"),
        "f2p_range_ko" to listOf("f2p_maple_r2h", "f2p_maple_rbaxe"),
        "f2p_bind_pure" to listOf("f2p_bind_blast", "f2p_bind_maple"),
        "f2p_addy_pure" to listOf("f2p_addy_r2h_tank", "f2p_addy_rbaxe_tank"),
        "f2p_mage_pure" to listOf("f2p_fire_blast_pure", "f2p_wind_blast_pure"),
        "f2p_bind_ko" to listOf("f2p_bind_r2h", "f2p_bind_rbaxe"),
        "rusher" to listOf("gmaul_rusher", "dds_rusher", "obby_rusher", "obby_mauler", "dwh_pure"),
        "edge_venge_zerker" to listOf("ancient_gs_venge", "zerker_venge_ags", "zerker_dcb_ags", "zerker_whip_claws", "veracs_venge_claws", "karils_venge_ags"),
        "edge_med_level" to listOf("med_whip_ags", "med_dcb_claws", "med_tribrid_ags", "blowpipe_venge_ags", "dhalberd_venge_ags"),
        "edge_void_risk" to listOf("void_dcb_claws", "void_dcb_ags", "void_ballista_ags"),
        "edge_void_melee" to listOf("void_melee_claws", "void_melee_ags", "void_dcb_claws", "void_dcb_ags"),
        "edge_barrows_venge" to listOf("karils_venge_ags", "veracs_venge_claws"),
        "mid_tank" to listOf("mid_tank_whip_ags", "mid_tank_dcb_ags", "toxic_sotd_hybrid"),
        "edge_unorthodox_risk" to listOf("blowpipe_venge_ags", "dhalberd_venge_ags", "obsidian_set_mauler", "spear_tribrid_ags", "sotd_hybrid_claws"),
        "deep_wild_nh" to listOf("elite_nh_ags", "elite_nh_claws", "volatile_nh", "tribrid_main", "elite_ancients_dbow", "toxic_sotd_hybrid", "spear_tribrid_ags", "sotd_hybrid_claws", "dwh_zerker_nh"),
        "deep_wild_budget_nh" to listOf("budget_nh_dds", "budget_nh_ags", "ancients_hybrid", "rune_pure_nh_anchor", "med_nh_anchor"),
        "low_level_nh" to listOf("low_level_nh_pure", "nh_pure", "budget_nh_dds"),
        "deep_wild_staff_spec" to listOf("volatile_nh", "toxic_sotd_hybrid", "sotd_hybrid_claws", "elite_nh_ags"),
    )

    private val byId = variants.associateBy { it.id }
    private val familiesByVariant: Map<String, Set<String>> = buildMap {
        for ((family, ids) in families) {
            for (id in ids) put(id, (get(id) ?: emptySet()) + family)
        }
    }

    fun get(id: String): BotPvpVariantDefinition? = byId[id]

    fun familyIdsForVariant(id: String): Set<String> = familiesByVariant[id].orEmpty()

    fun variantsForFamilies(familyIds: Collection<String>): Set<String> =
        familyIds.flatMap { families[it].orEmpty() }.toSet()
}
