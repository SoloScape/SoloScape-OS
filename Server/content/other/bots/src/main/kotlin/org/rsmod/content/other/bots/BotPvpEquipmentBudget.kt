package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.util.Wearpos
import org.rsmod.api.config.refs.BaseParams

/**
 * Keeps generated Wilderness equipment honest when a TSPS archetype's stats do not meet a
 * template item's requirements.
 *
 * The same cache stat requirements used by normal HeldEquipOp are checked here before the bot is
 * seeded. If a preferred style item cannot be equipped, we choose the highest-value tradeable
 * item at the same wear position that the bot can equip without exceeding the preferred item's
 * value. Weapons additionally keep the same weapon category. This gives the level scaler a safe,
 * bracket-preserving fallback instead of allowing synthetic players to bypass equip requirements.
 */
internal object BotPvpEquipmentBudget {
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
        val exact = resolveGeTradeableReplacement(name, levels)
            ?: exact(name)
            ?: return null
        return if (canEquip(exact, levels)) exact else bestEquivalent(exact, levels)
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
        else -> null
    }

    internal fun resolveGeTradeableReplacement(
        name: String,
        levels: Map<String, Int>,
    ): ItemServerType? {
        val replacement = geTradeableReplacement(name) ?: return null
        return ServerCacheManager.getItemTypes()
            .asSequence()
            .filter { it.tradeable && !it.isCert && !it.isPlaceholder }
            .filter { canEquip(it, levels) }
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
        val replacement = resolveGeTradeableReplacement(preferred.name, levels)
        if (replacement != null) {
            return replacement.internalName
        }
        if (geTradeableReplacement(preferred.name) != null) return null
        if (canEquip(preferred, levels)) return symbol
        val equivalent = bestEquivalent(preferred, levels) ?: return null
        return equivalent.internalName
    }

    private fun bestEquivalent(
        preferred: ItemServerType,
        levels: Map<String, Int>,
    ): ItemServerType? {
        val ceiling = value(preferred)
        if (ceiling <= 0) return null
        val weaponSlot = preferred.wearpos1 == Wearpos.RightHand.slot
        return ServerCacheManager.getItemTypes()
            .asSequence()
            .filter { it.id != preferred.id }
            .filter {
                it.tradeable && !it.isTransformation && !it.isDummyItem &&
                    geTradeableReplacement(it.name) == null
            }
            .filter { it.wearpos1 == preferred.wearpos1 }
            .filter { !weaponSlot || it.weaponCategory == preferred.weaponCategory }
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
