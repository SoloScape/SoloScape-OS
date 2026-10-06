package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.types.ItemServerType

/**
 * Applies the requested Wilderness supply identity while keeping quantities conservative enough
 * for Hybrid switch inventories. Blighted foods/restores are preferred; regular equivalents are
 * explicit fallbacks for cache revisions that do not contain a requested blighted item.
 */
internal object BotPvpRiskSupplyOverlay {
    private data class Supply(
        val names: List<String>,
        val count: Int,
    )

    private data class Plan(
        val food: List<String>,
        val supplies: List<Supply>,
    )

    private fun supply(count: Int, vararg names: String) = Supply(names.toList(), count)

    private val blightedKarambwan =
        supply(3, "Blighted karambwan", "Cooked karambwan")
    private val hybridKarambwan =
        supply(2, "Blighted karambwan", "Cooked karambwan")
    private val blightedRestore =
        supply(2, "Blighted super restore(4)", "Super restore(4)")
    private val hybridBlightedRestore =
        supply(1, "Blighted super restore(4)", "Super restore(4)")
    private val restore = supply(2, "Super restore(4)")
    private val hybridRestore = supply(1, "Super restore(4)")
    private val brew = supply(2, "Saradomin brew(4)")
    private val hybridBrew = supply(1, "Saradomin brew(4)")
    private val combat = supply(1, "Super combat potion(4)")
    private val range = supply(1, "Blighted ranging potion(4)", "Ranging potion(4)")
    private val magic = supply(1, "Magic potion(4)")
    private val imbuedHeart = supply(1, "Imbued heart", "Magic potion(4)")
    private val smoulderingHeart = supply(1, "Smouldering heart", "Magic potion(4)")

    private val plans: Map<Pair<BotPvpRiskTier, BotPvpLoadoutRole>, Plan> = mapOf(
        (BotPvpRiskTier.Low to BotPvpLoadoutRole.Pure) to Plan(
            food = listOf("Shark"),
            supplies = listOf(blightedKarambwan, combat, range, blightedRestore),
        ),
        (BotPvpRiskTier.Low to BotPvpLoadoutRole.Magic) to Plan(
            food = listOf("Shark"),
            supplies = listOf(blightedKarambwan, magic, blightedRestore),
        ),
        (BotPvpRiskTier.Low to BotPvpLoadoutRole.Ranged) to Plan(
            food = listOf("Shark"),
            supplies = listOf(blightedKarambwan, range, blightedRestore),
        ),
        (BotPvpRiskTier.Low to BotPvpLoadoutRole.Melee) to Plan(
            food = listOf("Shark"),
            supplies = listOf(blightedKarambwan, combat, blightedRestore),
        ),
        (BotPvpRiskTier.Low to BotPvpLoadoutRole.Hybrid) to Plan(
            food = listOf("Shark"),
            supplies = listOf(hybridKarambwan, combat, range, magic, hybridBlightedRestore),
        ),

        (BotPvpRiskTier.Average to BotPvpLoadoutRole.Pure) to Plan(
            food = listOf("Shark"),
            supplies = listOf(blightedKarambwan, combat, range, restore),
        ),
        (BotPvpRiskTier.Average to BotPvpLoadoutRole.Magic) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(blightedKarambwan, magic, brew, restore),
        ),
        (BotPvpRiskTier.Average to BotPvpLoadoutRole.Ranged) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(blightedKarambwan, range, restore),
        ),
        (BotPvpRiskTier.Average to BotPvpLoadoutRole.Melee) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(blightedKarambwan, combat, restore),
        ),
        (BotPvpRiskTier.Average to BotPvpLoadoutRole.Hybrid) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(hybridKarambwan, hybridBrew, hybridRestore, combat, range),
        ),

        (BotPvpRiskTier.Risker to BotPvpLoadoutRole.Pure) to Plan(
            food = listOf("Dark crab"),
            supplies = listOf(blightedKarambwan, brew, restore, combat, range),
        ),
        (BotPvpRiskTier.Risker to BotPvpLoadoutRole.Magic) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(blightedKarambwan, brew, restore, imbuedHeart),
        ),
        (BotPvpRiskTier.Risker to BotPvpLoadoutRole.Ranged) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(blightedKarambwan, brew, restore, range),
        ),
        (BotPvpRiskTier.Risker to BotPvpLoadoutRole.Melee) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(blightedKarambwan, brew, restore, combat),
        ),
        (BotPvpRiskTier.Risker to BotPvpLoadoutRole.Hybrid) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(hybridKarambwan, hybridBrew, hybridRestore, combat, range),
        ),

        (BotPvpRiskTier.Max to BotPvpLoadoutRole.Pure) to Plan(
            food = listOf("Dark crab"),
            supplies = listOf(blightedKarambwan, brew, restore, combat, range),
        ),
        (BotPvpRiskTier.Max to BotPvpLoadoutRole.Magic) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(blightedKarambwan, brew, restore, smoulderingHeart),
        ),
        (BotPvpRiskTier.Max to BotPvpLoadoutRole.Ranged) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(blightedKarambwan, brew, restore, range),
        ),
        (BotPvpRiskTier.Max to BotPvpLoadoutRole.Melee) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(blightedKarambwan, brew, restore, combat),
        ),
        (BotPvpRiskTier.Max to BotPvpLoadoutRole.Hybrid) to Plan(
            food = listOf("Blighted anglerfish", "Anglerfish"),
            supplies = listOf(hybridKarambwan, hybridBrew, hybridRestore, combat, range),
        ),
    )

    fun apply(loadout: BotPvpLoadout, assignment: BotPvpRiskAssignment): BotPvpLoadout {
        if (!loadout.members) return loadout
        val plan = plans[assignment.tier to assignment.role] ?: return loadout
        val food = resolve(plan.food)?.internalName ?: loadout.food
        val consumables = LinkedHashMap<String, Int>()

        for (entry in plan.supplies) {
            val item = resolve(entry.names) ?: continue
            consumables.merge(item.internalName, entry.count, Int::plus)
        }

        // Retreat logic expects the standard emergency teleport to remain available.
        val teleport = loadout.consumables.entries.firstOrNull { (symbol, _) ->
            BotPvpEquipmentBudget.item(symbol)?.name?.contains("teleport", ignoreCase = true) == true
        }
        if (teleport != null) {
            consumables.putIfAbsent(teleport.key, teleport.value)
        }

        return loadout.copy(food = food, consumables = consumables)
    }

    private fun resolve(names: List<String>): ItemServerType? =
        names.firstNotNullOfOrNull(::exact)

    private fun exact(name: String): ItemServerType? =
        ServerCacheManager.getItemTypes()
            .asSequence()
            .filter { it.name.equals(name, ignoreCase = true) }
            .filter { !it.isCert && !it.isPlaceholder && !it.isTransformation && !it.isDummyItem }
            .maxWithOrNull(compareBy<ItemServerType>(
                { maxOf(it.playerCostDerived, it.playerCost, it.cost, 0) },
                { it.id },
            ))
}
