package org.rsmod.content.other.bots

import dev.openrune.gamevals.GameValProvider
import kotlin.random.Random
import org.rsmod.api.combat.commons.magic.Spellbook
import org.rsmod.api.death.PlayerDeathDrops

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
        check(BotPvpDifficulty.parse("Easy") == BotPvpDifficulty.Novice)
        check(BotPvpDifficulty.parse("Medium") == BotPvpDifficulty.Standard)
        check(BotPvpDifficulty.parse("Very Hard") == BotPvpDifficulty.Veteran)
        check(BotPvpDifficulty.parse("Extreme") == BotPvpDifficulty.Elite)
        check(BotPvpDifficulty.parse("impossible") == null)
        check(BotPvpDifficulty.configured("mixed", 1) == BotPvpDifficulty.Novice)
        check(BotPvpDifficulty.configured("mixed", 2) == BotPvpDifficulty.Standard)
        check(BotPvpDifficulty.configured("mixed", 3) == BotPvpDifficulty.Veteran)
        check(BotPvpDifficulty.configured("mixed", 4) == BotPvpDifficulty.Elite)
        check(BotPvpDifficulty.configured("mixed", 5) == BotPvpDifficulty.Novice)
        check(BotPvpDifficulty.configured("elite", 1) == BotPvpDifficulty.Elite)
        val standardHybrid = BotPvpProfiles.get(BotPvpDifficulty.Standard, BotPvpLoadoutRole.Hybrid)
        check(standardHybrid.switchChance > BotPvpProfiles.get(BotPvpDifficulty.Standard).switchChance)
        check(standardHybrid.targetStyleReaction.first <=
            BotPvpProfiles.get(BotPvpDifficulty.Standard).targetStyleReaction.first)
        check(standardHybrid.confidenceTier ==
            BotPvpProfiles.get(BotPvpDifficulty.Standard).confidenceTier)

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

        check(PlayerDeathDrops.wildernessKeepCount(isSkulled = false, hasProtectItem = false) == 3)
        check(PlayerDeathDrops.wildernessKeepCount(isSkulled = true, hasProtectItem = false) == 0)
        check(PlayerDeathDrops.wildernessKeepCount(isSkulled = false, hasProtectItem = true) == 4)
        check(PlayerDeathDrops.wildernessKeepCount(isSkulled = true, hasProtectItem = true) == 1)
        check(BotPvpDeathPolicy.isLootKeyDeath(wildernessLevel = 1, inInstance = false))
        check(BotPvpDeathPolicy.isLootKeyDeath(wildernessLevel = 50, inInstance = false))
        check(!BotPvpDeathPolicy.isLootKeyDeath(wildernessLevel = -1, inInstance = false))
        check(!BotPvpDeathPolicy.isLootKeyDeath(wildernessLevel = 0, inInstance = false))
        check(!BotPvpDeathPolicy.isLootKeyDeath(wildernessLevel = 1, inInstance = true))
        check(BotPvpCrystalDeath.seedCount("Crystal helm") == 1)
        check(BotPvpCrystalDeath.seedCount("Crystal legs") == 2)
        check(BotPvpCrystalDeath.seedCount("Crystal body") == 3)
        check(BotPvpCrystalDeath.seedCount("Crystal armour seed") == 0)
        check(
            listOf("Crystal helm", "Crystal legs", "Crystal body")
                .sumOf(BotPvpCrystalDeath::seedCount) == 6
        )

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
        check(BotPvpPolicy.chooseTarget(
            listOf(1, 2), null, emptySet(), { 2 }, { 0 },
            { if (it == 1) 12 else 0 },
        ) == 2)
        // A live target or retaliation is still more important than the MAX unskulled preference.
        check(BotPvpPolicy.chooseTarget(
            listOf(1, 2), 1, emptySet(), { 2 }, { 0 },
            { if (it == 1) 12 else 0 },
        ) == 1)

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
        check(BotPvpTspsStats.byId.size == 89)
        check(BotPvpTspsStats.byId.keys == knownVariantIds)

        check(BotPvpHotspots.all.size == 26)
        check(BotPvpHotspots.all.map { it.id }.toSet() == setOf(
            "edge_ditch", "edge_south", "varrock_ditch", "revs_entrance", "green_drags_gate",
            "low_west", "low_center", "low_east", "dark_warriors", "graveyard_shadows",
            "eastern_unicorns", "crazy_archaeologist", "forgotten_cemetery", "boneyard",
            "black_chins", "eastern_mid", "chaos_fanatic", "lava_maze", "red_dragon_isle",
            "demonic_ruins", "rune_rocks", "fountain_of_rune", "mage_arena", "resource_area",
            "rogues_castle", "frozen_plateau",
        ))
        for (hotspot in BotPvpHotspots.all) {
            check(hotspot.targetBots in 1..hotspot.maxBots)
            check(hotspot.styleWeights.values.sum() in 0.999..1.001)
            check(hotspot.activityWeights.values.sum() in 0.999..1.001)
            check(hotspot.allowedFamilies.all { it in BotPvpTspsCatalog.families })
            check(hotspot.freeWorldFamilies.all { it in BotPvpTspsCatalog.families })
            check(hotspot.contains(hotspot.anchor))
            repeat(20) { check(hotspot.contains(hotspot.roam(random))) }
        }
        val memberRegions = BotPvpHotspots.available(true, BotPvpDifficulty.Standard)
        check(memberRegions.any { it.anchor.z < 3600 })
        check(memberRegions.any { it.anchor.z > 3900 })
        check(memberRegions.any { it.anchor.x < 3000 })
        check(memberRegions.any { it.anchor.x > 3280 })
        val assignments = (1..memberRegions.size * 4)
            .map { BotPvpHotspots.choose(it, true, BotPvpDifficulty.Standard).id }
            .groupingBy { it }
            .eachCount()
        check(assignments.keys == memberRegions.mapTo(hashSetOf()) { it.id })
        check(assignments.values.max() - assignments.values.min() <= 1)

        check(BotPvpRiskLoadouts.all.size == 20)
        for (role in BotPvpLoadoutRole.entries) {
            val low = BotPvpRiskLoadouts.get(BotPvpRiskTier.Low, role)
            if (role == BotPvpLoadoutRole.Hybrid) {
                check("Prayer potion" in low.supplies)
                check("Ranging potion" in low.supplies)
                check("Magic potion" in low.supplies)
                check("Blighted karambwan" in low.supplies)
                check("Blighted Super Restore(4)" !in low.supplies)
            } else {
                check(low.supplies.count { it == "Blighted Super Restore(4)" } == 1)
                check("Prayer potion" !in low.supplies)
            }
            check("Super restore" !in low.supplies)
        }
        check(BotPvpRiskLoadouts.all.map { it.tier to it.role }.distinct().size == 20)
        check(BotPvpRiskTier.fromDifficulty(BotPvpDifficulty.Novice) == BotPvpRiskTier.Low)
        check(BotPvpRiskTier.fromDifficulty(BotPvpDifficulty.Standard) == BotPvpRiskTier.Average)
        check(BotPvpRiskTier.fromDifficulty(BotPvpDifficulty.Veteran) == BotPvpRiskTier.Risker)
        check(BotPvpRiskTier.fromDifficulty(BotPvpDifficulty.Elite) == BotPvpRiskTier.Max)
        check(BotPvpRiskTier.Low.difficultyName == "Easy")
        check(BotPvpRiskTier.Average.difficultyName == "Medium")
        check(BotPvpRiskTier.Risker.difficultyName == "Very Hard")
        check(BotPvpRiskTier.Max.difficultyName == "Extreme")
        val pureAssignment = BotPvpRiskLoadouts.assignment(
            BotPvpDifficulty.Novice,
            checkNotNull(BotPvpLoadouts.get("low_level_dds_pure")),
        )
        check(pureAssignment.role == BotPvpLoadoutRole.Pure)
        check(pureAssignment.tier == BotPvpRiskTier.Low)
        check(!pureAssignment.preferUnskulled)
        check(pureAssignment.skullPreventionChance == 0.75)
        check(!pureAssignment.usesProtectItem)
        check(BotPvpPolicy.shouldPreventSkull(pureAssignment, 0.74))
        check(!BotPvpPolicy.shouldPreventSkull(pureAssignment, 0.75))
        val hybridAssignment = BotPvpRiskLoadouts.assignment(
            BotPvpDifficulty.Elite,
            checkNotNull(BotPvpLoadouts.get("ancients_hybrid")),
        )
        check(hybridAssignment.role == BotPvpLoadoutRole.Hybrid)
        check(hybridAssignment.tier == BotPvpRiskTier.Max)
        check(hybridAssignment.preferUnskulled)
        check(hybridAssignment.hybridHardestInTier)
        check(hybridAssignment.skullPreventionChance == 0.0)
        check(hybridAssignment.usesProtectItem)
        check(!BotPvpPolicy.shouldPreventSkull(hybridAssignment, 0.0))
        val averageAssignment = BotPvpRiskLoadouts.assignment(
            BotPvpDifficulty.Standard,
            checkNotNull(BotPvpLoadouts.get("ancients_hybrid")),
        )
        val riskerAssignment = BotPvpRiskLoadouts.assignment(
            BotPvpDifficulty.Veteran,
            checkNotNull(BotPvpLoadouts.get("ancients_hybrid")),
        )
        check(averageAssignment.skullPreventionChance == 0.80)
        check(riskerAssignment.skullPreventionChance == 0.95)
        check(!averageAssignment.usesProtectItem)
        check(!riskerAssignment.usesProtectItem)
        for (tier in BotPvpRiskTier.entries) {
            for (role in BotPvpLoadoutRole.entries) {
                val preset = BotPvpRiskLoadouts.get(tier, role)
                check(preset.gear.isNotEmpty())
                check(preset.supplies.isNotEmpty())
                check(preset.preferUnskulled == (tier == BotPvpRiskTier.Max))
            }
        }

        val scalablePure = checkNotNull(BotPvpLoadouts.get("low_level_dds_pure"))
        val pureMinimums = scalablePure.levels.mapValues { (stat, _) ->
            if (stat == "stat.hitpoints") 10 else 1
        }
        val levelTenPure = BotPvpLevelScaling.scaleToCombat(
            scalablePure.levels,
            pureMinimums,
            BotPvpLevelScaling.MIN_COMBAT_LEVEL,
        )
        check(BotPvpLevelScaling.combatLevel(levelTenPure) == 10)
        check(levelTenPure.getValue("stat.defence") == 1)
        check(levelTenPure.getValue("stat.hitpoints") >= 10)
        val protectItemPure = scalablePure.copy(
            levels = scalablePure.levels + ("stat.prayer" to 1),
        )
        val protectItemScaled = BotPvpLevelScaling.scale(
            protectItemPure,
            identity = 7,
            minimumPrayer = 25,
        )
        check(protectItemScaled.levels.getValue("stat.prayer") >= 25)
        val scaledSamples = (0..256).map { BotPvpLevelScaling.scale(scalablePure, it) }
        check(scaledSamples.all {
            val combat = BotPvpLevelScaling.combatLevel(it.levels)
            combat in BotPvpLevelScaling.MIN_COMBAT_LEVEL..
                BotPvpLevelScaling.combatLevel(scalablePure.levels)
        })

        check(BotPvpLoadouts.nativeTemplateCount == 18)
        check(BotPvpLoadouts.all.size == 89)
        check(BotPvpLoadouts.all.map { it.id }.distinct().size == BotPvpLoadouts.all.size)
        check(BotPvpLoadouts.available(false).all { !it.members })
        check(BotPvpLoadouts.available(true).all { it.members })
        check((1..80).all { !BotPvpLoadouts.choose(it, false).members })
        check((1..80).all { BotPvpLoadouts.choose(it, true).members })
        check(BotPvpLoadouts.all.count { it.spellbook == Spellbook.Standard } == 41)
        check(BotPvpLoadouts.all.count { it.spellbook == Spellbook.Ancients } == 27)
        check(BotPvpLoadouts.all.count { it.spellbook == Spellbook.Lunars } == 21)
        check(BotPvpLoadouts.all.any { it.vengeance })
        check(BotPvpLoadouts.all.any { it.styles.size == 3 })
        check(BotPvpLoadouts.all.any { it.id == "gmaul_rusher" && "obj.granite_maul" in it.specialWeapons })
        check(BotPvpLoadouts.all.any { it.spellbook == Spellbook.Standard && it.freezeSpell != null })
        check(BotPvpLoadouts.get("mid_tank_dcb_ags")?.spellbook == Spellbook.Standard)
        check(BotPvpLoadouts.get("void_pure_claws")?.spellbook == Spellbook.Lunars)
        check(BotPvpLoadouts.get("budget_anti_pk")?.spellbook == Spellbook.Ancients)
        check(BotPvpLoadouts.get("low_level_nh_pure")?.attackSpell == "Ice blitz")
        val barrageUnlocked = BotPvpLoadouts.all.filter {
            it.spellbook == Spellbook.Ancients && it.levels.getValue("stat.magic") >= 94
        }
        check(barrageUnlocked.isNotEmpty())
        check(barrageUnlocked.all {
            it.runePacks == mapOf(
                BotPvpLoadouts.BLIGHTED_ANCIENT_ICE_SACK_ID to
                    BotPvpLoadouts.BLIGHTED_ANCIENT_ICE_SACK_COUNT
            )
        })
        check(barrageUnlocked.all { it.runes.isEmpty() })
        val preBarrageAncients = BotPvpLoadouts.all.filter {
            it.spellbook == Spellbook.Ancients && it.levels.getValue("stat.magic") < 94
        }
        check(preBarrageAncients.all { it.runePacks.isEmpty() })
        check(preBarrageAncients.all { it.runes.isNotEmpty() })
        val f2pBindRunes = checkNotNull(BotPvpLoadouts.get("f2p_bind_blast")).runes.keys
        check(setOf("obj.airrune", "obj.waterrune", "obj.earthrune", "obj.deathrune", "obj.naturerune")
            .all { it in f2pBindRunes })
        val f2pBoltRunes = checkNotNull(BotPvpLoadouts.get("f2p_bind_maple")).runes.keys
        check("obj.chaosrune" in f2pBoltRunes)
        for (hotspot in BotPvpHotspots.available(true, BotPvpDifficulty.Elite)) {
            val chosen = BotPvpLoadouts.choose(73, true, BotPvpDifficulty.Elite, hotspot.id)
            check(BotPvpTspsCatalog.familyIdsForVariant(chosen.id).any { it in hotspot.families(true) })
        }

        check(BotPvpEquipmentBudget.geTradeableReplacement("Dragonstone helmet") ==
            "Gilded full helm")
        check(BotPvpEquipmentBudget.geTradeableReplacement("Dragonstone full helm") ==
            "Gilded full helm")
        check(BotPvpEquipmentBudget.geTradeableReplacement("Dragonstone platebody") ==
            "Gilded platebody")
        check(BotPvpEquipmentBudget.geTradeableReplacement("Dragonstone platelegs") ==
            "Gilded platelegs")
        check(BotPvpEquipmentBudget.geTradeableReplacement("Dragonstone boots") ==
            "Gilded boots")
        check(BotPvpEquipmentBudget.geTradeableReplacement("Dragonstone gauntlets") ==
            "Combat bracelet")
        check(BotPvpEquipmentBudget.geTradeableReplacement("Frozen abyssal whip") ==
            "Abyssal whip")
        check(BotPvpEquipmentBudget.geTradeableReplacement("Abyssal tentacle") ==
            "Ursine chainmace (u)")
        check(BotPvpEquipmentBudget.sameFallbackFamily("Torva platelegs", "Rune platelegs"))
        check(BotPvpEquipmentBudget.sameFallbackFamily("Torva platelegs", "Bronze platelegs"))
        check(!BotPvpEquipmentBudget.sameFallbackFamily("Torva platelegs", "Masori chaps"))
        check(BotPvpEquipmentBudget.sameFallbackFamily("Zaryte crossbow", "Rune crossbow"))
        check(BotPvpEquipmentBudget.sameFallbackFamily("Zaryte crossbow", "Crossbow"))
        check(BotPvpEquipmentBudget.sameFallbackFamily("Abyssal whip", "Bronze scimitar"))
        check(BotPvpEquipmentBudget.sameFallbackFamily("Ancient staff", "Staff of fire"))
        check(BotPvpEquipmentBudget.sameFallbackFamily("Black d'hide body", "Leather body"))
        check(!BotPvpEquipmentBudget.sameFallbackFamily("Zaryte crossbow", "Ghrazi rapier"))
        check(!BotPvpEquipmentBudget.sameFallbackFamily("Avernic treads", "Primordial boots"))
        check(BotPvpRiskGearOverlay.keepsLegacyBaseItem("Rune arrow", stackable = true))
        check(BotPvpRiskGearOverlay.keepsLegacyBaseItem("Unholy blessing", stackable = false))
        check(!BotPvpRiskGearOverlay.keepsLegacyBaseItem("Rune chainbody", stackable = false))
        check(!BotPvpRiskGearOverlay.keepsLegacyBaseItem("Amulet of glory", stackable = false))
        check(!BotPvpRiskGearOverlay.keepsLegacyBaseItem("Climbing boots", stackable = false))
        check(!BotPvpRiskGearOverlay.keepsLegacyBaseItem("Abyssal whip", stackable = false))
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
        val mappedItemIds = itemMappings.values.toHashSet()
        val requiredRunePackIds = BotPvpLoadouts.all.flatMap { it.runePacks.keys }.distinct()
        val missingRunePackIds = requiredRunePackIds.filter { it !in mappedItemIds }
        check(missingRunePackIds.isEmpty()) {
            "PvP rune-pack item mappings missing: $missingRunePackIds"
        }
        println("PvP gameval checks passed: ${requiredItems.size} native item mappings.")

        for (loadout in BotPvpLoadouts.all) {
            check(loadout.primaryStyle in loadout.styles)
            check(loadout.levels.values.all { it in 1..99 })
            check(loadout.styles.values.flatten().all { it.startsWith("obj.") })
            check(loadout.specialWeapons.all { it.startsWith("obj.") })
            check(loadout.runes.values.all { it > 0 })
            check(loadout.runePacks.values.all { it > 0 })
            check(!loadout.vengeance || loadout.spellbook == Spellbook.Lunars)
            val exact = checkNotNull(BotPvpTspsStats.byId[loadout.id])
            check(loadout.levels["stat.attack"] == exact[0])
            check(loadout.levels["stat.defence"] == exact[1])
            check(loadout.levels["stat.strength"] == exact[2])
            check(loadout.levels["stat.hitpoints"] == exact[3])
            check(loadout.levels["stat.ranged"] == exact[4])
            check(loadout.levels["stat.prayer"] == exact[5])
            check(loadout.levels["stat.magic"] == exact[6])
        }
        println("PvP decision checks passed: reaction latency, counter-styles, food, retreats, " +
            "finite spec energy, exact TSPS stats/spellbooks, 18 native templates, 89 variants, " +
            "28 families and 16 Wilderness regions.")
    }
}
