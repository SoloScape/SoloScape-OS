package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import org.rsmod.api.config.refs.BaseParams

/**
 * Keeps generated Wilderness equipment honest when a TSPS archetype's stats do not meet a
 * template item's requirements.
 *
 * The same cache stat requirements used by normal HeldEquipOp are checked here before the bot is
 * seeded. If a preferred style item cannot be equipped, we choose the highest-value tradeable
 * item from a curated equipment family at the same wear position that the bot can equip without
 * exceeding the preferred item's value. Weapon families are curated explicitly so low-stat bots
 * can step down across weapon classes instead of becoming unarmed.
 *
 * Unclassified items deliberately have no automatic fallback. Omitting an unusable item is safer
 * than allowing an unrelated high-value cache item to leak into an economy-facing PvP loadout.
 */
internal object BotPvpEquipmentBudget {
    private val fallbackFamilies: List<Set<String>> = listOf(
        setOf(
            "Torva full helm", "Dharok's helm", "Helm of neitiznot", "Rune full helm",
            "Gilded full helm", "Adamant full helm", "Mithril full helm", "Steel full helm",
            "Iron full helm", "Bronze full helm",
        ),
        setOf(
            "Torva platebody", "Dharok's platebody", "Torag's platebody", "Fighter torso",
            "Rune platebody", "Gilded platebody", "Adamant platebody", "Mithril platebody",
            "Steel platebody", "Iron platebody", "Bronze platebody",
        ),
        setOf(
            "Torva platelegs", "Dharok's platelegs", "Torag's platelegs", "Rune platelegs",
            "Gilded platelegs", "Adamant platelegs", "Mithril platelegs", "Steel platelegs",
            "Iron platelegs", "Bronze platelegs",
        ),
        setOf("Ancestral hat", "Ahrim's hood", "Mystic hat", "Elder chaos hood", "Wizard hat"),
        setOf("Ancestral robe top", "Ahrim's robetop", "Mystic robe top", "Elder chaos top", "Wizard robe"),
        setOf("Ancestral robe bottom", "Ahrim's robeskirt", "Mystic robe bottom", "Elder chaos robe", "Blue skirt"),
        setOf("Masori mask", "Crystal helm", "Karil's coif", "Archer helm", "Coif", "Leather cowl"),
        setOf(
            "Masori body", "Crystal body", "Karil's leathertop", "Black d'hide body",
            "Green d'hide body", "Studded body", "Leather body",
        ),
        setOf(
            "Masori chaps", "Crystal legs", "Karil's leatherskirt", "Black d'hide chaps",
            "Green d'hide chaps", "Studded chaps", "Leather chaps",
        ),
        setOf("Primordial boots", "Dragon boots", "Rune boots", "Gilded boots"),
        setOf("Pegasian boots", "Ranger boots"),
        setOf("Eternal boots", "Infinity boots", "Mystic boots"),
        setOf("Amulet of rancour", "Amulet of torture", "Amulet of fury", "Amulet of glory"),
        setOf("Necklace of anguish", "Amulet of fury", "Amulet of glory"),
        setOf("Occult necklace", "Amulet of fury", "Amulet of glory"),
        setOf("Ferocious gloves", "Barrows gloves", "Combat bracelet"),
        setOf("Tormented bracelet", "Barrows gloves", "Combat bracelet"),
        setOf("Infernal cape", "Fire cape", "Obsidian cape"),
        setOf("Dizana's quiver", "Ava's assembler", "Ava's accumulator"),
        setOf(
            "Saradomin cape(i)", "Guthix cape(i)", "Zamorak cape(i)",
            "Saradomin cape", "Guthix cape", "Zamorak cape",
        ),
        setOf(
            "Zaryte crossbow", "Armadyl crossbow", "Dragon crossbow", "Rune crossbow",
            "Adamant crossbow", "Mithril crossbow", "Steel crossbow", "Iron crossbow",
            "Bronze crossbow", "Crossbow",
        ),
        setOf(
            "Bow of faerdhinen", "Crystal bow", "Magic shortbow (i)", "Magic shortbow",
            "Maple shortbow", "Willow shortbow", "Oak shortbow", "Shortbow",
        ),
        setOf(
            "Volatile nightmare staff", "Kodai wand", "Toxic staff of the dead", "Ancient staff",
            "Mystic fire staff", "Magic staff", "Staff of fire", "Staff",
        ),
        setOf(
            "Ghrazi rapier", "Ursine chainmace (u)", "Abyssal whip", "Dragon scimitar",
            "Rune scimitar", "Adamant scimitar", "Mithril scimitar", "Steel scimitar",
            "Iron scimitar", "Bronze scimitar",
        ),
        setOf("Avernic defender", "Dragon defender", "Rune defender"),
    ).map { family -> family.mapTo(hashSetOf()) { it.lowercase() } }

    fun sanitize(loadout: BotPvpLoadout): BotPvpLoadout {
        val styles = loadout.styles.mapValues { (_, equipment) ->
            equipment.mapNotNull { symbol -> resolveSymbol(symbol, loadout.levels) }
        }
        val specials = loadout.specialWeapons.filter { symbol ->
            val type = ServerCacheManager.getItem(symbol.asRSCM(RSCMType.OBJ))
            type != null && canEquip(type, loadout.levels)
        }
        return loadout.copy(styles = styles, specialWeapons = specials)
    }

    fun canEquip(type: ItemServerType, levels: Map<String, Int>): Boolean {
        if (!type.isEquipable || type.isCert || type.isPlaceholder) return false
        return meetsRequirement(
            type,
            BaseParams.statreq1_skill,
            BaseParams.statreq1_level,
            levels,
        ) && meetsRequirement(
            type,
            BaseParams.statreq2_skill,
            BaseParams.statreq2_level,
            levels,
        )
    }

    fun value(type: ItemServerType): Int =
        maxOf(type.playerCostDerived, type.playerCost, type.cost, 0)

    fun item(symbol: String): ItemServerType? =
        ServerCacheManager.getItem(symbol.asRSCM(RSCMType.OBJ))

    fun resolveExactUsable(name: String, levels: Map<String, Int>): ItemServerType? =
        exact(name)?.takeIf { canEquip(it, levels) }

    fun resolvePreferred(name: String, levels: Map<String, Int>): ItemServerType? {
        val preferred = if (geTradeableReplacement(name) != null) {
            geTradeableReplacementType(name)
        } else {
            exact(name)
        } ?: return null
        return if (canEquip(preferred, levels)) preferred else bestEquivalent(preferred, levels)
    }

    /**
     * Custom cosmetic variants are intentionally normalized to standard GE-tradeable equipment
     * before a Wilderness bot can be seeded.
     */
    internal fun geTradeableReplacement(name: String): String? = when (name.lowercase()) {
        "dragonstone helmet", "dragonstone full helm" -> "Gilded full helm"
        "dragonstone platebody" -> "Gilded platebody"
        "dragonstone platelegs" -> "Gilded platelegs"
        "dragonstone boots" -> "Gilded boots"
        "dragonstone gauntlets", "dragonstone gloves" -> "Combat bracelet"
        "frozen abyssal whip" -> "Abyssal whip"
        "abyssal tentacle" -> "Ursine chainmace (u)"
        else -> null
    }

    internal fun resolveGeTradeableReplacement(
        name: String,
        levels: Map<String, Int>,
    ): ItemServerType? =
        geTradeableReplacementType(name)?.takeIf { canEquip(it, levels) }

    private fun geTradeableReplacementType(name: String): ItemServerType? {
        val replacement = geTradeableReplacement(name) ?: return null
        return ServerCacheManager.getItemTypes()
            .asSequence()
            .filter { it.tradeable && !it.isCert && !it.isPlaceholder }
            .filter {
                when (replacement) {
                    "Gilded full helm" ->
                        it.name.contains("gilded", ignoreCase = true) &&
                            it.name.contains("full helm", ignoreCase = true)
                    "Gilded platebody" ->
                        it.name.contains("gilded", ignoreCase = true) &&
                            it.name.contains("platebody", ignoreCase = true)
                    "Gilded platelegs" ->
                        it.name.contains("gilded", ignoreCase = true) &&
                            it.name.contains("platelegs", ignoreCase = true)
                    "Gilded boots" ->
                        it.name.contains("gilded", ignoreCase = true) &&
                            it.name.contains("boots", ignoreCase = true)
                    "Combat bracelet" -> it.name.equals("Combat bracelet", ignoreCase = true)
                    "Abyssal whip" -> it.name.equals("Abyssal whip", ignoreCase = true)
                    "Ursine chainmace (u)" ->
                        it.name.contains("Ursine chainmace", ignoreCase = true) &&
                            it.name.contains("(u)", ignoreCase = true)
                    else -> it.name.equals(replacement, ignoreCase = true)
                }
            }
            .maxWithOrNull(compareBy<ItemServerType>({ value(it) }, { it.id }))
    }

    private fun exact(name: String): ItemServerType? =
        ServerCacheManager.getItemTypes()
            .asSequence()
            .filter { it.name.equals(name, ignoreCase = true) }
            .filter { !it.isCert && !it.isPlaceholder && !it.isTransformation && !it.isDummyItem }
            .maxWithOrNull(compareBy<ItemServerType>({ value(it) }, { it.id }))

    private fun resolveSymbol(symbol: String, levels: Map<String, Int>): String? {
        val preferred = item(symbol) ?: return null
        if (geTradeableReplacement(preferred.name) != null) {
            val normalized = geTradeableReplacementType(preferred.name) ?: return null
            return if (canEquip(normalized, levels)) {
                normalized.internalName
            } else {
                bestEquivalent(normalized, levels)?.internalName
            }
        }
        if (canEquip(preferred, levels)) return symbol
        val equivalent = bestEquivalent(preferred, levels) ?: return null
        return equivalent.internalName
    }

    internal fun sameFallbackFamily(preferredName: String, candidateName: String): Boolean {
        val preferred = preferredName.lowercase()
        val candidate = candidateName.lowercase()
        return fallbackFamilies.any { family -> preferred in family && candidate in family }
    }

    private fun bestEquivalent(
        preferred: ItemServerType,
        levels: Map<String, Int>,
    ): ItemServerType? {
        val ceiling = value(preferred)
        if (ceiling <= 0) return null
        return ServerCacheManager.getItemTypes()
            .asSequence()
            .filter { it.id != preferred.id }
            .filter { !it.name.equals(preferred.name, ignoreCase = true) }
            .filter {
                it.tradeable && !it.isTransformation && !it.isDummyItem &&
                    geTradeableReplacement(it.name) == null
            }
            .filter { sameFallbackFamily(preferred.name, it.name) }
            .filter { it.wearpos1 == preferred.wearpos1 }
            .filter { canEquip(it, levels) }
            .filter { value(it) in 1..ceiling }
            .maxWithOrNull(compareBy<ItemServerType>({ value(it) }, { it.id }))
    }

    private fun meetsRequirement(
        type: ItemServerType,
        skillParam: dev.openrune.TypedParamType<dev.openrune.types.StatType>,
        levelParam: dev.openrune.TypedParamType<Int>,
        levels: Map<String, Int>,
    ): Boolean {
        val skill = type.paramOrNull(skillParam) ?: return true
        val required = type.paramOrNull(levelParam) ?: 0
        val stat = RSCM.getReverseMapping(RSCMType.STAT, skill.id)
        return (levels[stat] ?: 1) >= required
    }
}
