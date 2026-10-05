package org.rsmod.content.other.bots

import kotlin.random.Random
import org.rsmod.map.CoordGrid

/** Native copy of the five enabled TSPS wilderness hotspot definitions. */
data class BotPvpHotspot(
    val id: String,
    val anchor: CoordGrid,
    val minX: Int,
    val maxX: Int,
    val minZ: Int,
    val maxZ: Int,
    val targetBots: Int,
    val maxBots: Int,
    val roamRadius: Int,
    val lingerCycles: Int,
    val maxSimultaneousFights: Int?,
    val allowedProfiles: Set<BotPvpDifficulty>,
    val allowedFamilies: Set<String>,
    val freeWorldFamilies: Set<String> = emptySet(),
    val styleWeights: Map<BotPvpStyle, Double>,
    val activityWeights: Map<String, Double>,
) {
    fun families(members: Boolean): Set<String> =
        if (members) allowedFamilies else (allowedFamilies + freeWorldFamilies)
            .filterTo(linkedSetOf()) { it.startsWith("f2p_") }

    fun contains(coord: CoordGrid): Boolean =
        coord.level == anchor.level && coord.x in minX..maxX && coord.z in minZ..maxZ

    fun spawn(random: Random): CoordGrid {
        val x = (anchor.x + random.nextInt(-roamRadius, roamRadius + 1)).coerceIn(minX, maxX)
        val z = (anchor.z + random.nextInt(-roamRadius, roamRadius + 1)).coerceIn(minZ, maxZ)
        return CoordGrid(x, z, anchor.level)
    }
}

object BotPvpHotspots {
    private val f2p = setOf(
        "f2p_strength_pure", "f2p_rune_pure", "f2p_range_ko", "f2p_bind_pure",
        "f2p_addy_pure", "f2p_mage_pure", "f2p_bind_ko",
    )

    val all: List<BotPvpHotspot> = listOf(
        BotPvpHotspot(
            id = "edge_ditch", anchor = CoordGrid(3085, 3528),
            minX = 3078, maxX = 3091, minZ = 3525, maxZ = 3535,
            targetBots = 13, maxBots = 18, roamRadius = 6, lingerCycles = 15,
            maxSimultaneousFights = 5,
            allowedProfiles = setOf(BotPvpDifficulty.Standard, BotPvpDifficulty.Veteran, BotPvpDifficulty.Elite),
            allowedFamilies = setOf(
                "edge_main_melee", "edge_ranged_melee", "low_level_pure", "rune_pure_members",
                "edge_venge_zerker", "edge_med_level", "edge_void_risk", "void_pure",
                "edge_void_melee", "edge_barrows_venge", "mid_tank", "edge_unorthodox_risk",
                "rusher", "budget_pk",
            ),
            freeWorldFamilies = f2p,
            styleWeights = mapOf(BotPvpStyle.Melee to 0.45, BotPvpStyle.Ranged to 0.25, BotPvpStyle.Magic to 0.30),
            activityWeights = mapOf("seek" to 0.62, "bait" to 0.25, "fight" to 0.05, "escape" to 0.08),
        ),
        BotPvpHotspot(
            id = "edge_south", anchor = CoordGrid(3099, 3529),
            minX = 3092, maxX = 3106, minZ = 3525, maxZ = 3536,
            targetBots = 9, maxBots = 14, roamRadius = 7, lingerCycles = 19,
            maxSimultaneousFights = 4,
            allowedProfiles = BotPvpDifficulty.entries.toSet(),
            allowedFamilies = setOf(
                "edge_main_melee", "edge_ranged_melee", "low_level_pure", "rune_pure_members",
                "initiate_pure", "void_pure", "rusher", "budget_pk", "anti_pk_hybrid",
                "edge_venge_zerker", "edge_med_level", "edge_void_risk", "edge_void_melee",
                "edge_barrows_venge", "mid_tank", "edge_unorthodox_risk",
            ),
            freeWorldFamilies = f2p,
            styleWeights = mapOf(BotPvpStyle.Melee to 0.30, BotPvpStyle.Ranged to 0.33, BotPvpStyle.Magic to 0.37),
            activityWeights = mapOf("seek" to 0.44, "bait" to 0.18, "fight" to 0.20, "escape" to 0.18),
        ),
        BotPvpHotspot(
            id = "varrock_ditch", anchor = CoordGrid(3243, 3526),
            minX = 3228, maxX = 3262, minZ = 3525, maxZ = 3542,
            targetBots = 80, maxBots = 112, roamRadius = 3, lingerCycles = 17,
            maxSimultaneousFights = 8,
            allowedProfiles = BotPvpDifficulty.entries.toSet(),
            allowedFamilies = f2p,
            styleWeights = mapOf(BotPvpStyle.Melee to 0.48, BotPvpStyle.Ranged to 0.30, BotPvpStyle.Magic to 0.22),
            activityWeights = mapOf("seek" to 0.50, "bait" to 0.16, "fight" to 0.22, "escape" to 0.12),
        ),
        BotPvpHotspot(
            id = "revs_entrance", anchor = CoordGrid(3134, 3838),
            minX = 3129, maxX = 3139, minZ = 3833, maxZ = 3843,
            targetBots = 6, maxBots = 12, roamRadius = 4, lingerCycles = 16,
            maxSimultaneousFights = null,
            allowedProfiles = setOf(BotPvpDifficulty.Standard, BotPvpDifficulty.Veteran, BotPvpDifficulty.Elite),
            allowedFamilies = setOf(
                "deep_wild_hybrid", "deep_wild_nh", "low_level_nh", "deep_wild_budget_nh",
                "deep_wild_staff_spec", "edge_unorthodox_risk", "anti_pk_hybrid",
                "edge_ranged_melee", "edge_med_level",
            ),
            styleWeights = mapOf(BotPvpStyle.Melee to 0.12, BotPvpStyle.Ranged to 0.28, BotPvpStyle.Magic to 0.60),
            activityWeights = mapOf("seek" to 0.46, "bait" to 0.14, "fight" to 0.10, "escape" to 0.30),
        ),
        BotPvpHotspot(
            id = "green_drags_gate", anchor = CoordGrid(2988, 3610),
            minX = 2974, maxX = 3002, minZ = 3598, maxZ = 3622,
            targetBots = 6, maxBots = 12, roamRadius = 8, lingerCycles = 16,
            maxSimultaneousFights = null,
            allowedProfiles = setOf(BotPvpDifficulty.Novice, BotPvpDifficulty.Standard, BotPvpDifficulty.Veteran),
            allowedFamilies = setOf(
                "budget_pk", "anti_pk_hybrid", "low_level_nh", "edge_main_melee",
                "low_level_pure", "edge_venge_zerker", "edge_med_level", "edge_void_melee",
                "mid_tank", "edge_barrows_venge", "edge_unorthodox_risk",
                "deep_wild_budget_nh", "deep_wild_staff_spec",
            ),
            styleWeights = mapOf(BotPvpStyle.Melee to 0.44, BotPvpStyle.Ranged to 0.18, BotPvpStyle.Magic to 0.38),
            activityWeights = mapOf("seek" to 0.54, "bait" to 0.16, "fight" to 0.08, "escape" to 0.22),
        ),
    )

    private val byId = all.associateBy { it.id }

    fun get(id: String?): BotPvpHotspot? = id?.let(byId::get)

    fun available(members: Boolean, difficulty: BotPvpDifficulty): List<BotPvpHotspot> =
        all.filter { hotspot ->
            difficulty in hotspot.allowedProfiles && hotspot.families(members).any { family ->
                BotPvpTspsCatalog.families[family].orEmpty().any { variantId ->
                    val variant = BotPvpTspsCatalog.get(variantId)
                    variant != null && variant.minimumDifficulty.ordinal <= difficulty.ordinal &&
                        (members || variant.f2p)
                }
            }
        }

    /** Population weighting follows TSPS targetBots; the identity makes assignment deterministic. */
    fun choose(identity: Int, members: Boolean, difficulty: BotPvpDifficulty): BotPvpHotspot {
        val choices = available(members, difficulty).ifEmpty { all }
        val total = choices.sumOf { it.targetBots.coerceAtLeast(1) }
        var roll = Math.floorMod(identity * 37 - 1, total)
        for (hotspot in choices) {
            roll -= hotspot.targetBots.coerceAtLeast(1)
            if (roll < 0) return hotspot
        }
        return choices.last()
    }
}
