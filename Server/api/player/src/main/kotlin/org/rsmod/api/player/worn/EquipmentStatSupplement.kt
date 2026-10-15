package org.rsmod.api.player.worn

/**
 * Server-side additions for combat-skill equip requirements missing from the loaded item cache.
 *
 * An item's native statreq parameters take precedence when the same skill is present.
 * This table is deliberately NOT used for ammunition or skilling-use requirements.
 *
 * Source: runtime equipment export cross-checked with a community OSRS requirements snapshot.
 * Keep quest/activity checks in their dedicated restrictions; this is stat-only.
 */
internal object EquipmentStatSupplement {
    internal data class Requirement(val skill: String, val level: Int) {
        val internalName: String
            get() = "stat.$skill"
    }

    private val allowedSkills =
        setOf("attack", "strength", "defence", "hitpoints", "ranged", "magic", "prayer")

    private const val RESOURCE = "/org/rsmod/api/player/worn/equipment-stat-requirements.tsv"

    private val byItemId: Map<Int, List<Requirement>> by lazy { load() }

    fun requirementsFor(itemId: Int): List<Requirement> = byItemId[itemId].orEmpty()

    /**
     * Preserves in-cache requirements, even if they differ from the supplement, and returns
     * only missing skills. This prevents stale supplemental data from replacing newer cache rules.
     */
    fun additionalRequirements(
        itemId: Int,
        nativeSkills: Set<String>,
    ): List<Requirement> =
        requirementsFor(itemId).filter { it.internalName !in nativeSkills }

    fun unmetRequirements(
        itemId: Int,
        nativeSkills: Set<String>,
        baseLevel: (String) -> Int,
    ): List<Requirement> =
        additionalRequirements(itemId, nativeSkills)
            .filter { baseLevel(it.internalName) < it.level }

    private fun load(): Map<Int, List<Requirement>> {
        val stream = checkNotNull(EquipmentStatSupplement::class.java.getResourceAsStream(RESOURCE)) {
            "Missing equipment stat supplement resource: $RESOURCE"
        }

        val requirements = linkedMapOf<Int, MutableList<Requirement>>()
        stream.bufferedReader(Charsets.UTF_8).useLines { lines ->
            lines.forEachIndexed { index, rawLine ->
                val line = rawLine.trim()
                if (line.isEmpty() || line.startsWith("#") || line == "item_id\tskill\tlevel") {
                    return@forEachIndexed
                }

                val columns = line.split('\t')
                require(columns.size == 3) { "Malformed equipment requirement at line ${index + 1}" }
                val id = columns[0].toIntOrNull()
                val skill = columns[1]
                val level = columns[2].toIntOrNull()

                require(id != null && id >= 0) { "Invalid equipment item ID at line ${index + 1}" }
                require(skill in allowedSkills) { "Invalid equipment skill at line ${index + 1}: $skill" }
                require(level != null && level in 2..99) {
                    "Invalid equipment level at line ${index + 1}"
                }

                val itemRequirements = requirements.getOrPut(id) { mutableListOf() }
                require(itemRequirements.none { it.skill == skill }) {
                    "Duplicate equipment skill for item $id at line ${index + 1}"
                }
                itemRequirements += Requirement(skill, level)
            }
        }
        return requirements
    }
}
