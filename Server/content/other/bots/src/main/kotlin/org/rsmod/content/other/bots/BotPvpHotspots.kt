package org.rsmod.content.other.bots

import kotlin.random.Random
import org.rsmod.map.CoordGrid

/**
 * The five enabled TSPS hotspot definitions are retained below, then supplemented with native
 * Wilderness roaming regions so large bot populations cover low, mid and deep Wilderness instead
 * of accumulating around the southern ditch.
 */
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
    fun families(members: Boolean): Set<String> = if (members) {
        allowedFamilies.filterTo(linkedSetOf()) { !it.startsWith("f2p_") }
    } else {
        (allowedFamilies + freeWorldFamilies).filterTo(linkedSetOf()) { it.startsWith("f2p_") }
    }

    fun contains(coord: CoordGrid): Boolean =
        coord.level == anchor.level && coord.x in minX..maxX && coord.z in minZ..maxZ

    fun spawn(random: Random): CoordGrid {
        // Keep initial placement close to a known-good anchor; broad roaming happens after spawn.
        val radius = minOf(roamRadius, 7)
        val x = (anchor.x + random.nextInt(-radius, radius + 1)).coerceIn(minX, maxX)
        val z = (anchor.z + random.nextInt(-radius, radius + 1)).coerceIn(minZ, maxZ)
        return CoordGrid(x, z, anchor.level)
    }

    fun roam(random: Random): CoordGrid =
        CoordGrid(
            random.nextInt(minX, maxX + 1),
            random.nextInt(minZ, maxZ + 1),
            anchor.level,
        )
}

object BotPvpHotspots {
    private val f2p = setOf(
        "f2p_strength_pure", "f2p_rune_pure", "f2p_range_ko", "f2p_bind_pure",
        "f2p_addy_pure", "f2p_mage_pure", "f2p_bind_ko",
    )

    /**
     * Native roaming regions accept every compatible TSPS family. The members/F2P split is still
     * enforced by [BotPvpHotspot.families], and difficulty gates remain enforced when choosing the
     * concrete variant.
     */
    private val roamingFamilies = BotPvpTspsCatalog.families.keys.toSet()

    private fun roaming(
        id: String,
        anchor: CoordGrid,
        radiusX: Int,
        radiusZ: Int,
        deep: Boolean = false,
    ): BotPvpHotspot =
        BotPvpHotspot(
            id = id,
            anchor = anchor,
            minX = anchor.x - radiusX,
            maxX = anchor.x + radiusX,
            minZ = anchor.z - radiusZ,
            maxZ = anchor.z + radiusZ,
            targetBots = 8,
            maxBots = 32,
            roamRadius = maxOf(radiusX, radiusZ),
            lingerCycles = if (deep) 24 else 20,
            maxSimultaneousFights = null,
            allowedProfiles = BotPvpDifficulty.entries.toSet(),
            allowedFamilies = roamingFamilies,
            styleWeights = if (deep) {
                mapOf(
                    BotPvpStyle.Melee to 0.15,
                    BotPvpStyle.Ranged to 0.30,
                    BotPvpStyle.Magic to 0.55,
                )
            } else {
                mapOf(
                    BotPvpStyle.Melee to 0.34,
                    BotPvpStyle.Ranged to 0.31,
                    BotPvpStyle.Magic to 0.35,
                )
            },
            activityWeights = if (deep) {
                mapOf("seek" to 0.42, "bait" to 0.12, "fight" to 0.16, "escape" to 0.30)
            } else {
                mapOf("seek" to 0.55, "bait" to 0.15, "fight" to 0.15, "escape" to 0.15)
            },
        )

    val all: List<BotPvpHotspot> = listOf(
        // Original TSPS hotspots.
        BotPvpHotspot(
            id = "edge_ditch", anchor = CoordGrid(3085, 3528),
            minX = 3078, maxX = 3091, minZ = 3525, maxZ = 3535,
            targetBots = 13, maxBots = 18, roamRadius = 6, lingerCycles = 15,
            maxSimultaneousFights = 5,
            allowedProfiles = setOf(
                BotPvpDifficulty.Standard,
                BotPvpDifficulty.Veteran,
                BotPvpDifficulty.Elite,
            ),
            allowedFamilies = setOf(
                "edge_main_melee", "edge_ranged_melee", "low_level_pure", "rune_pure_members",
                "edge_venge_zerker", "edge_med_level", "edge_void_risk", "void_pure",
                "edge_void_melee", "edge_barrows_venge", "mid_tank", "edge_unorthodox_risk",
                "rusher", "budget_pk",
            ),
            freeWorldFamilies = f2p,
            styleWeights = mapOf(
                BotPvpStyle.Melee to 0.45,
                BotPvpStyle.Ranged to 0.25,
                BotPvpStyle.Magic to 0.30,
            ),
            activityWeights = mapOf(
                "seek" to 0.62,
                "bait" to 0.25,
                "fight" to 0.05,
                "escape" to 0.08,
            ),
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
            styleWeights = mapOf(
                BotPvpStyle.Melee to 0.30,
                BotPvpStyle.Ranged to 0.33,
                BotPvpStyle.Magic to 0.37,
            ),
            activityWeights = mapOf(
                "seek" to 0.44,
                "bait" to 0.18,
                "fight" to 0.20,
                "escape" to 0.18,
            ),
        ),
        BotPvpHotspot(
            id = "varrock_ditch", anchor = CoordGrid(3243, 3526),
            minX = 3228, maxX = 3262, minZ = 3525, maxZ = 3542,
            targetBots = 80, maxBots = 112, roamRadius = 3, lingerCycles = 17,
            maxSimultaneousFights = 8,
            allowedProfiles = BotPvpDifficulty.entries.toSet(),
            allowedFamilies = f2p,
            styleWeights = mapOf(
                BotPvpStyle.Melee to 0.48,
                BotPvpStyle.Ranged to 0.30,
                BotPvpStyle.Magic to 0.22,
            ),
            activityWeights = mapOf(
                "seek" to 0.50,
                "bait" to 0.16,
                "fight" to 0.22,
                "escape" to 0.12,
            ),
        ),
        BotPvpHotspot(
            id = "revs_entrance", anchor = CoordGrid(3134, 3838),
            minX = 3129, maxX = 3139, minZ = 3833, maxZ = 3843,
            targetBots = 6, maxBots = 12, roamRadius = 4, lingerCycles = 16,
            maxSimultaneousFights = null,
            allowedProfiles = setOf(
                BotPvpDifficulty.Standard,
                BotPvpDifficulty.Veteran,
                BotPvpDifficulty.Elite,
            ),
            allowedFamilies = setOf(
                "deep_wild_hybrid", "deep_wild_nh", "low_level_nh", "deep_wild_budget_nh",
                "deep_wild_staff_spec", "edge_unorthodox_risk", "anti_pk_hybrid",
                "edge_ranged_melee", "edge_med_level",
            ),
            styleWeights = mapOf(
                BotPvpStyle.Melee to 0.12,
                BotPvpStyle.Ranged to 0.28,
                BotPvpStyle.Magic to 0.60,
            ),
            activityWeights = mapOf(
                "seek" to 0.46,
                "bait" to 0.14,
                "fight" to 0.10,
                "escape" to 0.30,
            ),
        ),
        BotPvpHotspot(
            id = "green_drags_gate", anchor = CoordGrid(2988, 3610),
            minX = 2974, maxX = 3002, minZ = 3598, maxZ = 3622,
            targetBots = 6, maxBots = 12, roamRadius = 8, lingerCycles = 16,
            maxSimultaneousFights = null,
            allowedProfiles = setOf(
                BotPvpDifficulty.Novice,
                BotPvpDifficulty.Standard,
                BotPvpDifficulty.Veteran,
            ),
            allowedFamilies = setOf(
                "budget_pk", "anti_pk_hybrid", "low_level_nh", "edge_main_melee",
                "low_level_pure", "edge_venge_zerker", "edge_med_level", "edge_void_melee",
                "mid_tank", "edge_barrows_venge", "edge_unorthodox_risk",
                "deep_wild_budget_nh", "deep_wild_staff_spec",
            ),
            styleWeights = mapOf(
                BotPvpStyle.Melee to 0.44,
                BotPvpStyle.Ranged to 0.18,
                BotPvpStyle.Magic to 0.38,
            ),
            activityWeights = mapOf(
                "seek" to 0.54,
                "bait" to 0.16,
                "fight" to 0.08,
                "escape" to 0.22,
            ),
        ),

        // Broad native coverage regions. Bots spawn close to these known-good anchors, then their
        // seek destinations range across the much larger rectangles so a large population fills
        // the Wilderness instead of forming obvious piles around a dozen points.
        roaming("low_west", CoordGrid(2998, 3562), radiusX = 28, radiusZ = 24),
        roaming("low_center", CoordGrid(3125, 3565), radiusX = 34, radiusZ = 24),
        roaming("low_east", CoordGrid(3260, 3562), radiusX = 34, radiusZ = 24),
        roaming("dark_warriors", CoordGrid(3029, 3638), radiusX = 30, radiusZ = 28),
        roaming("graveyard_shadows", CoordGrid(3165, 3672), radiusX = 30, radiusZ = 28),
        roaming("eastern_unicorns", CoordGrid(3218, 3678), radiusX = 30, radiusZ = 28),
        roaming("crazy_archaeologist", CoordGrid(2977, 3702), radiusX = 28, radiusZ = 28),
        roaming("forgotten_cemetery", CoordGrid(2978, 3760), radiusX = 28, radiusZ = 28),
        roaming("boneyard", CoordGrid(3255, 3748), radiusX = 30, radiusZ = 28),
        roaming("black_chins", CoordGrid(3148, 3770), radiusX = 30, radiusZ = 30),
        roaming("eastern_mid", CoordGrid(3309, 3765), radiusX = 30, radiusZ = 30),
        roaming("chaos_fanatic", CoordGrid(2979, 3846), radiusX = 28, radiusZ = 26, deep = true),
        roaming("lava_maze", CoordGrid(3075, 3855), radiusX = 28, radiusZ = 26, deep = true),
        roaming("red_dragon_isle", CoordGrid(3194, 3858), radiusX = 26, radiusZ = 26, deep = true),
        roaming("demonic_ruins", CoordGrid(3287, 3883), radiusX = 28, radiusZ = 28, deep = true),
        roaming("rune_rocks", CoordGrid(3060, 3885), radiusX = 24, radiusZ = 24, deep = true),
        roaming("fountain_of_rune", CoordGrid(3370, 3890), radiusX = 22, radiusZ = 24, deep = true),
        roaming("mage_arena", CoordGrid(3102, 3938), radiusX = 26, radiusZ = 24, deep = true),
        roaming("resource_area", CoordGrid(3185, 3933), radiusX = 26, radiusZ = 24, deep = true),
        roaming("rogues_castle", CoordGrid(3284, 3946), radiusX = 26, radiusZ = 24, deep = true),
        roaming("frozen_plateau", CoordGrid(2964, 3944), radiusX = 28, radiusZ = 24, deep = true),
    )

    private val byId = all.associateBy { it.id }

    fun get(id: String?): BotPvpHotspot? = id?.let(byId::get)

    fun available(members: Boolean, difficulty: BotPvpDifficulty): List<BotPvpHotspot> =
        all.filter { hotspot ->
            difficulty in hotspot.allowedProfiles && hotspot.families(members).any { family ->
                BotPvpTspsCatalog.families[family].orEmpty().any { variantId ->
                    val variant = BotPvpTspsCatalog.get(variantId)
                    variant != null && variant.minimumDifficulty.ordinal <= difficulty.ordinal &&
                        (if (members) !variant.f2p else variant.f2p)
                }
            }
        }

    /**
     * Spread consecutive world-bot identities evenly across every compatible region. TSPS
     * targetBots/maxBots remain available as source metadata, but no single imported hotspot is
     * allowed to dominate a large SoloScape population.
     */
    fun choose(identity: Int, members: Boolean, difficulty: BotPvpDifficulty): BotPvpHotspot {
        val choices = available(members, difficulty).ifEmpty { all }
        return choices[Math.floorMod(identity - 1, choices.size)]
    }
}
