package org.rsmod.content.skills.woodcutting.scripts

/** Native revision-240 scenery; no additional world objects are created. */
data class SpecialTreeDefinition(
    val level: Int,
    val product: String,
    val xp: Double,
    val stump: String,
    val despawnTicks: Int,
    val respawnTicks: Int,
    val depletionDenominator: Int = 0,
    val axeRates: List<Pair<Int, Int>>,
)

/**
 * Sources: OSRS Wiki Sulliuscep, Blisterwood_tree, Jatoba_tree, Camphor_tree,
 * Ironwood_tree and Rosewood_tree, retrieved 11 October 2026.
 * The live cache has the native scenery and transforms, but its resource DBRows contain no columns.
 */
object SpecialTreeDefinitions {
    private val metals = listOf("bronze", "iron", "steel", "black", "mithril", "adamant", "rune", "dragon", "crystal")
    private val definitions = mapOf(
        // The published Jatoba depletion rule is absent; 1/8 uses the old hardwood baseline.
        // This is an explicit audit limitation until the authored rule can be recovered.
        "loc.jatoba_tree" to SpecialTreeDefinition(40, "obj.jatoba_logs", 92.0, "loc.jatoba_tree_stump", 0, 14, 8,
            listOf(8 to 25, 12 to 37, 16 to 50, 18 to 56, 20 to 62, 24 to 75, 28 to 87, 30 to 93, 32 to 100)),
        "loc.camphor_tree" to SpecialTreeDefinition(66, "obj.camphor_logs", 143.5, "loc.camphor_tree_update_stump", 200, 99, 0,
            listOf(8 to 23, 11 to 36, 15 to 47, 17 to 71, 19 to 59, 23 to 71, 27 to 83, 32 to 89, 34 to 93)),
        "loc.ironwood_tree" to SpecialTreeDefinition(80, "obj.ironwood_logs", 175.0, "loc.ironwood_tree_update_stump", 400, 200, 0,
            listOf(6 to 21, 10 to 38, 13 to 42, 15 to 46, 17 to 53, 21 to 63, 24 to 75, 29 to 80, 30 to 83)),
        "loc.rosewood_tree" to SpecialTreeDefinition(92, "obj.rosewood_logs", 212.5, "loc.rosewood_tree_update_stump", 458, 205, 0,
            listOf(6 to 18, 9 to 28, 12 to 37, 13 to 40, 15 to 47, 18 to 56, 21 to 66, 25 to 70, 27 to 73)),
        "loc.fossil_cep_grown" to SpecialTreeDefinition(65, "obj.bittercap_mushroom", 127.0, "loc.fossil_cep_sprout", 0, 0, 16,
            listOf(11 to 55, 17 to 85, 23 to 115, 26 to 131, 29 to 147, 35 to 177, 41 to 208, 45 to 228, 48 to 240)),
        // Bronze and dragon are developer-confirmed anchors. Other tiers are interpolated;
        // their exact original rates remain an explicit audit limitation.
        "loc.blisterwood_tree" to SpecialTreeDefinition(62, "obj.blisterwood_logs", 76.0,
            "loc.blisterwood_tree", 0, 0, 10,
            listOf(15 to 50, 23 to 75, 31 to 99, 36 to 112, 40 to 124,
                48 to 149, 57 to 174, 61 to 186, 65 to 198)),
    )

    val naturalNames: List<String> = listOf(
        "loc.jatoba_tree", "loc.camphor_tree", "loc.ironwood_tree", "loc.rosewood_tree",
    )

    /** Only mature farmed trees, after Check-health, expose the Chop down operation. */
    val ordinaryNames: List<String> = listOf(
        "loc.jatoba_tree", "loc.camphor_tree", "loc.ironwood_tree", "loc.rosewood_tree",
        "loc.camphor_tree_fullygrown", "loc.ironwood_tree_fullygrown", "loc.rosewood_tree_fullygrown",
    )

    fun get(name: String): SpecialTreeDefinition? {
        definitions[name]?.let { return it }
        val farmed = ordinaryNames.drop(4).firstOrNull { it == name } ?: return null
        val natural = farmed.removeSuffix("_fullygrown")
        return definitions.getValue(natural).copy(
            stump = natural + "_stump", despawnTicks = 0,
            // Player-grown hardwoods use the original 1/8 depletion rule.
            respawnTicks = 200, depletionDenominator = 8,
        )
    }

    fun rates(treeName: String, axeName: String): Pair<Int, Int>? {
        val definition = get(treeName) ?: return null
        val metal = when (axeName) {
            "obj.trail_gilded_axe" -> "rune"
            "obj.infernal_axe", "obj.infernal_axe_empty", "obj.3a_axe",
            "obj.trailblazer_axe", "obj.trailblazer_axe_no_infernal",
            "obj.crystal_axe_inactive" -> "dragon"
            else -> axeName.removePrefix("obj.").removeSuffix("_axe")
        }
        val index = metals.indexOf(metal)
        return definition.axeRates.getOrNull(index)
    }

    fun nextSulliuscep(current: Int): Int = (current.coerceIn(0, 5) + 1) % 6
}
