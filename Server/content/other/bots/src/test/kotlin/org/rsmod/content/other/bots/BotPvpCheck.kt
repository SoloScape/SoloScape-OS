package org.rsmod.content.other.bots

import dev.openrune.gamevals.GameValProvider
import kotlin.random.Random
import org.rsmod.api.combat.commons.magic.Spellbook

object BotPvpCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val elite = BotPvpProfiles.get(BotPvpDifficulty.Elite)
        val novice = BotPvpProfiles.get(BotPvpDifficulty.Novice)
        check(elite.comboEatChance > novice.comboEatChance)
        check(elite.switchChance > novice.switchChance)
        check(elite.targetStyleReaction.last < novice.targetStyleReaction.last ||
            elite.confidenceTier > novice.confidenceTier)
        check(BotPvpDifficulty.parse("ELITE") == BotPvpDifficulty.Elite)
        check(BotPvpDifficulty.parse("impossible") == null)

        val reaction = BotPvpReaction()
        check(reaction.observe(BotPvpStyle.Melee, 10, 3) == BotPvpStyle.Melee)
        check(reaction.observe(BotPvpStyle.Ranged, 11, 3) == BotPvpStyle.Melee)
        check(reaction.observe(BotPvpStyle.Ranged, 13, 3) == BotPvpStyle.Melee)
        check(reaction.observe(BotPvpStyle.Ranged, 14, 3) == BotPvpStyle.Ranged)
        check(reaction.observe(BotPvpStyle.Magic, 15, 3) == BotPvpStyle.Ranged)
        check(reaction.observe(BotPvpStyle.Ranged, 16, 3) == BotPvpStyle.Ranged)
        check(reaction.observe(BotPvpStyle.Magic, 17, 3) == BotPvpStyle.Ranged)
        check(reaction.observe(BotPvpStyle.Magic, 19, 3) == BotPvpStyle.Ranged)
        check(reaction.observe(BotPvpStyle.Magic, 20, 3) == BotPvpStyle.Magic)
        reaction.reset()
        check(reaction.observe(BotPvpStyle.Melee, 21, 3) == BotPvpStyle.Melee)
        check(reaction.observe(BotPvpStyle.Ranged, 22, 0) == BotPvpStyle.Ranged)

        val styles = BotPvpStyle.entries.toSet()
        check(BotPvpPolicy.chooseStyle(styles, BotPvpStyle.Melee, BotPvpStyle.Melee,
            false, false, 1, 0.5) != BotPvpStyle.Melee)
        check(BotPvpPolicy.chooseStyle(styles, BotPvpStyle.Melee, null,
            true, false, 5, 0.5) != BotPvpStyle.Melee)
        check(BotPvpPolicy.chooseStyle(styles, BotPvpStyle.Melee, null,
            false, true, 5, 0.5) != BotPvpStyle.Melee)
        check(BotPvpPolicy.chooseStyle(setOf(BotPvpStyle.Ranged),
            BotPvpStyle.Melee, BotPvpStyle.Ranged, true, false, 8, 0.5) == BotPvpStyle.Ranged)

        check(BotPvpPolicy.shouldEat(39, 99, 0.39))
        check(!BotPvpPolicy.shouldEat(40, 99, 0.39))
        check(!BotPvpPolicy.shouldEat(0, 99, 0.39))
        check(BotPvpPolicy.shouldRetreat(10, 99, 0, elite))
        check(!BotPvpPolicy.shouldRetreat(10, 99, 1, elite))
        check(!BotPvpPolicy.shouldRetreat(80, 99, 0, elite))
        check(!BotPvpPolicy.shouldRetreat(0, 99, 0, elite))
        check(BotPvpPolicy.shouldSpec(20, 99, 35, 500, 500, elite, 0.1))
        check(!BotPvpPolicy.shouldSpec(20, 99, 35, 499, 500, elite, 0.1))
        check(!BotPvpPolicy.shouldSpec(99, 99, 35, 1000, 500, elite, 0.1))
        check(!BotPvpPolicy.shouldSpec(20, 99, 35, 1000, 500, novice, 0.9))
        check(!BotPvpPolicy.shouldSpec(0, 99, 35, 1000, 500, elite, 0.1))
        check(!BotPvpPolicy.shouldSpec(20, 99, 35, 1000, Int.MAX_VALUE, elite, 0.1))

        check(!BotPvpPolicy.specialConsumed(1000, 1000))
        check(BotPvpPolicy.specialConsumed(1000, 500))
        check(!BotPvpPolicy.specialConsumed(500, 600))
        check(BotPvpPolicy.crossesDitch(3523, 3518))
        check(BotPvpPolicy.crossesDitch(3519, 3550))
        check(!BotPvpPolicy.crossesDitch(3523, 3550))
        check(!BotPvpPolicy.crossesDitch(3540, 3518))

        val distance: (Int) -> Int = { if (it == 1) 2 else 10 }
        val free: (Int) -> Int = { 0 }
        check(BotPvpPolicy.chooseTarget(emptyList(), null, emptySet(), distance, free) == null)
        check(BotPvpPolicy.chooseTarget(listOf(1, 2), null, emptySet(), distance, free) == 1)
        check(BotPvpPolicy.chooseTarget(listOf(1, 2), 2, emptySet(), distance, free) == 2)
        check(BotPvpPolicy.chooseTarget(listOf(1, 2), 1, setOf(2), distance, free) == 2)
        check(BotPvpPolicy.chooseTarget(listOf(1, 2), null, emptySet(), distance,
            { if (it == 1) 2 else 0 }) == 2)

        val random = Random(42)
        repeat(100) {
            val next = BotPvpPolicy.nextReview(100, 3..5, random)
            check(next in 103..105)
        }
        check(BotPvpPolicy.nextReview(100, 1..1, random) == 101)

        check(BotPvpTspsCatalog.variants.size == 89)
        check(BotPvpTspsCatalog.variants.map { it.id }.distinct().size == 89)
        check(BotPvpTspsCatalog.families.size == 28)
        val knownVariantIds = BotPvpTspsCatalog.variants.mapTo(hashSetOf()) { it.id }
        check(BotPvpTspsCatalog.families.values.flatten().all { it in knownVariantIds })
        check(BotPvpTspsCatalog.families.values.flatten().toSet() == knownVariantIds)

        check(BotPvpHotspots.all.size == 5)
        check(BotPvpHotspots.all.map { it.id }.toSet() == setOf(
            "edge_ditch", "edge_south", "varrock_ditch", "revs_entrance", "green_drags_gate",
        ))
        for (hotspot in BotPvpHotspots.all) {
            check(hotspot.targetBots in 1..hotspot.maxBots)
            check(hotspot.styleWeights.values.sum() in 0.999..1.001)
            check(hotspot.activityWeights.values.sum() in 0.999..1.001)
            check(hotspot.allowedFamilies.all { it in BotPvpTspsCatalog.families })
            check(hotspot.freeWorldFamilies.all { it in BotPvpTspsCatalog.families })
            check(hotspot.contains(hotspot.anchor))
        }

        check(BotPvpLoadouts.all.size == 89)
        check(BotPvpLoadouts.all.map { it.id }.distinct().size == BotPvpLoadouts.all.size)
        check(BotPvpLoadouts.available(false).all { !it.members })
        check(BotPvpLoadouts.available(true).all { it.members })
        check((1..80).all { !BotPvpLoadouts.choose(it, false).members })
        check((1..80).all { BotPvpLoadouts.choose(it, true).members })
        check(BotPvpLoadouts.all.any { it.vengeance })
        check(BotPvpLoadouts.all.any { it.styles.size == 3 })
        check(BotPvpLoadouts.all.any { it.id == "gmaul_rusher" && "obj.granite_maul" in it.specialWeapons })
        check(BotPvpLoadouts.all.any { it.spellbook == Spellbook.Standard && it.freezeSpell != null })
        for (hotspot in BotPvpHotspots.available(true, BotPvpDifficulty.Elite)) {
            val chosen = BotPvpLoadouts.choose(73, true, BotPvpDifficulty.Elite, hotspot.id)
            check(BotPvpTspsCatalog.familyIdsForVariant(chosen.id).any { it in hotspot.families(true) })
        }

        val itemMappings = checkNotNull(GameValProvider.loadIsolated().mappings["obj"])
        val requiredItems = BotPvpLoadouts.all.flatMap { loadout ->
            loadout.styles.values.flatten() + loadout.specialWeapons + loadout.food +
                loadout.consumables.keys + loadout.runes.keys +
                listOfNotNull(loadout.attackSpell, loadout.freezeSpell).filter {
                    it.startsWith("obj.")
                } + if (loadout.vengeance) listOf("obj.94_vengeance") else emptyList()
        }.distinct()
        val missingItems = requiredItems.filter { (itemMappings[it] ?: -1) < 0 }
        check(missingItems.isEmpty()) { "PvP loadout mappings missing: $missingItems" }
        println("PvP gameval checks passed: ${requiredItems.size} native item mappings.")

        for (loadout in BotPvpLoadouts.all) {
            check(loadout.primaryStyle in loadout.styles)
            check(loadout.levels.values.all { it in 1..99 })
            check(loadout.styles.values.flatten().all { it.startsWith("obj.") })
            check(loadout.specialWeapons.all { it.startsWith("obj.") })
            check(loadout.runes.values.all { it > 0 })
            check(!loadout.vengeance || loadout.spellbook == Spellbook.Lunars)
        }
        println("PvP decision checks passed: reaction latency, counter-styles, food, retreats, " +
            "finite spec energy, target priorities, 89 TSPS variants, 28 families and 5 hotspots.")
    }
}
