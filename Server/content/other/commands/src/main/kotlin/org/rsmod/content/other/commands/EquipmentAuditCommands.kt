package org.rsmod.content.other.commands

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.util.Wearpos
import jakarta.inject.Inject
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import org.rsmod.api.config.refs.BaseParams
import org.rsmod.api.player.output.mes
import org.rsmod.api.player.worn.EquipmentStatSupplement
import org.rsmod.game.cheat.Cheat
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

/**
 * Administrator-only, read-only runtime cache audit.
 * Enumerates all items that the normal equip operation recognizes as having a wear slot,
 * not just items explicitly overridden by raw-cache/server/items.toml.
 */
class EquipmentAuditCommands @Inject constructor() : PluginScript() {
    override fun ScriptContext.startup() {
        onCommand("equipmentaudit", "Export all equip item requirements to CSV", ::audit)
    }

    private fun audit(cheat: Cheat) = with(cheat) {
        runCatching {
            val definitions = ServerCacheManager.getItems().values
            val equipable = definitions.asSequence()
                .filter { Wearpos[it.wearpos1] != null }
                .filterNot { it.isCert || it.isPlaceholder || it.isDummyItem }
                .sortedBy { it.id }
                .map(::inspect)
                .toList()

            val directory = Path.of("build", "equipment-audit")
            Files.createDirectories(directory)
            val csvFile = directory.resolve("runtime-equipment.csv")
            val summaryFile = directory.resolve("summary.txt")

            val header = listOf(
                "item_id", "internal_name", "display_name", "wear_slot",
                "statreq1_skill", "statreq1_level", "statreq2_skill", "statreq2_level",
                "skill_use_levelrequire", "expected_attack_standard_family", "audit_flags",
                "effective_equip_requirements", "supplemental_equip_requirements",
            )
            val csv = buildString {
                appendLine(header.joinToString(","))
                for (row in equipable) {
                    val columns = listOf(
                        row.id.toString(), row.name, row.displayName, row.slot,
                        row.first.skill.orEmpty(), row.first.level?.toString().orEmpty(),
                        row.second.skill.orEmpty(), row.second.level?.toString().orEmpty(),
                        row.useLevel?.toString().orEmpty(),
                        row.expectedAttack?.toString().orEmpty(),
                        row.flags.joinToString(";"),
                        row.effectiveRequirements,
                        row.supplementalRequirements,
                    )
                    appendLine(columns.joinToString(",") { it.csvCell() })
                }
            }
            Files.writeString(csvFile, csv, StandardCharsets.UTF_8)

            val noStatReq = equipable.count { it.first.skill == null && it.second.skill == null }
            val noEffectiveStatReq = equipable.count { it.effectiveRequirements.isBlank() }
            val withSupplement = equipable.count { it.supplementalRequirements.isNotBlank() }
            val incomplete = equipable.count { row ->
                row.flags.any { it.startsWith("incomplete") || it.startsWith("invalid") }
            }
            val lowAttack = equipable.count {
                "missing_expected_attack_requirement" in it.flags
            }
            val bySlot = equipable.groupingBy { it.slot }.eachCount().toSortedMap()
            val report = buildString {
                appendLine("Runtime equipment requirement audit")
                appendLine("All loaded item definitions: " + definitions.size)
                appendLine("Equippable item definitions: " + equipable.size)
                appendLine("No native stat skill requirement in loaded definition: " + noStatReq)
                appendLine("Items with added supplemental combat requirements: " + withSupplement)
                appendLine("No effective equip stat requirement: " + noEffectiveStatReq)
                appendLine("Malformed stat requirement pairs: " + incomplete)
                appendLine("Missing effective Attack requirements in known metal families: " + lowAttack)
                appendLine()
                appendLine("Wear slot counts:")
                for ((slot, count) in bySlot) appendLine("  " + slot + ": " + count)
                appendLine()
                appendLine("No stat requirement is not automatically a bug.")
                appendLine("Compare each item with actual OSRS level and quest requirements.")
                appendLine("This command is read-only and does not simulate equipment attempts.")
            }
            Files.writeString(summaryFile, report, StandardCharsets.UTF_8)
            report.lines().take(6).forEach(player::mes)
            player.mes("Equipment CSV: " + csvFile.toAbsolutePath())
            player.mes("Audit summary: " + summaryFile.toAbsolutePath())
        }.onFailure {
            player.mes("Equipment audit failed: " + (it.message ?: "unknown error"))
        }
    }

    private fun inspect(item: ItemServerType): AuditRow {
        val first = Requirement(
            skillName(item.paramOrNull(BaseParams.statreq1_skill)?.id),
            item.paramOrNull(BaseParams.statreq1_level),
        )
        val second = Requirement(
            skillName(item.paramOrNull(BaseParams.statreq2_skill)?.id),
            item.paramOrNull(BaseParams.statreq2_level),
        )
        val nativeSkills = listOfNotNull(first.skill, second.skill).toSet()
        val supplemental = EquipmentStatSupplement.additionalRequirements(item.id, nativeSkills)
        val supplementalRequirements = supplemental.joinToString(";") {
            it.internalName + ":" + it.level
        }
        val nativeRequirements = listOf(first, second)
            .filter { it.skill != null && it.level != null }
            .joinToString(";") { "${it.skill}:${it.level}" }
        val effectiveRequirements =
            listOf(nativeRequirements, supplementalRequirements)
                .filter { it.isNotBlank() }
                .joinToString(";")
        val expectedAttack = expectedMetalAttack(item.internalName)
        val actualAttack = listOf(first, second).firstOrNull {
            it.skill == "stat.attack"
        }?.level ?: supplemental.firstOrNull { it.skill == "attack" }?.level
        val flags = buildList {
            if ((first.skill == null) != (first.level == null)) add("incomplete_statreq1")
            if ((second.skill == null) != (second.level == null)) add("incomplete_statreq2")
            if (first.level != null && first.level <= 0) add("invalid_statreq1_level")
            if (second.level != null && second.level <= 0) add("invalid_statreq2_level")
            if (expectedAttack != null && (actualAttack ?: 0) < expectedAttack) {
                add("missing_expected_attack_requirement")
            }
        }
        return AuditRow(
            id = item.id,
            name = item.internalName,
            displayName = item.name,
            slot = Wearpos[item.wearpos1].toString(),
            first = first,
            second = second,
            useLevel = item.paramOrNull(BaseParams.levelrequire),
            expectedAttack = expectedAttack,
            flags = flags,
            supplementalRequirements = supplementalRequirements,
            effectiveRequirements = effectiveRequirements,
        )
    }

    private fun skillName(id: Int?): String? {
        if (id == null) return null
        return runCatching { RSCM.getReverseMapping(RSCMType.STAT, id) }.getOrNull()
    }

    // Conservative automated Attack check, not a substitute for item-specific OSRS rules.
    // Warhammers and other special weapons are intentionally not covered by this heuristic.
    private fun expectedMetalAttack(name: String): Int? {
        val match = METAL_WEAPON.find(name.removePrefix("obj.")) ?: return null
        if (match.range.first != 0) return null
        return when (match.groupValues[1]) {
            "steel" -> 5
            "black" -> 10
            "mithril" -> 20
            "adamant" -> 30
            "rune" -> 40
            "dragon" -> 60
            else -> null
        }
    }

    private fun String.csvCell(): String = "\"" + replace("\"", "\"\"") + "\""

    private data class Requirement(val skill: String?, val level: Int?)

    private data class AuditRow(
        val id: Int,
        val name: String,
        val displayName: String,
        val slot: String,
        val first: Requirement,
        val second: Requirement,
        val useLevel: Int?,
        val expectedAttack: Int?,
        val flags: List<String>,
        val supplementalRequirements: String,
        val effectiveRequirements: String,
    )

    private companion object {
        private val METAL_WEAPON = Regex(
            "^(steel|black|mithril|adamant|rune|dragon)_" +
                "(axe|pickaxe|scimitar|longsword|sword|2h_sword|dagger|battleaxe|" +
                "halberd|spear|mace|claws)(?:_|$)"
        )
    }
}
