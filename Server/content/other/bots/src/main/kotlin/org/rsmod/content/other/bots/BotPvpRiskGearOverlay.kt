package org.rsmod.content.other.bots

import dev.openrune.types.ItemServerType

/**
 * Structured runtime form of the player-authored 4x5 Wilderness gear matrix.
 *
 * Matrix gear overrides matching worn slots on the pinned TSPS style. Unspecified slots (notably
 * ammunition and a few utility slots) stay on the proven TSPS loadout. Missing cache names are
 * intentionally ignored so a cache revision/custom-content mismatch cannot make a bot unspawnable.
 */
internal object BotPvpRiskGearOverlay {
    private data class Choice(val alternatives: List<List<String>>)

    private data class Plan(
        val shared: List<Choice> = emptyList(),
        val melee: List<Choice> = emptyList(),
        val ranged: List<Choice> = emptyList(),
        val magic: List<Choice> = emptyList(),
        val specials: List<Choice> = emptyList(),
    ) {
        fun forStyle(style: BotPvpStyle): List<Choice> = shared + when (style) {
            BotPvpStyle.Melee -> melee
            BotPvpStyle.Ranged -> ranged
            BotPvpStyle.Magic -> magic
        }
    }

    private fun one(name: String) = Choice(listOf(listOf(name)))
    private fun any(vararg names: String) = Choice(names.map { listOf(it) })
    private fun set(vararg names: String) = Choice(listOf(names.toList()))
    private fun sets(vararg alternatives: List<String>) = Choice(alternatives.toList())

    private val elderChaos = set("Elder chaos hood", "Elder chaos top", "Elder chaos robe")
    private val mystic = set("Mystic hat", "Mystic robe top", "Mystic robe bottom")
    private val blackDhide = set("Black d'hide body", "Black d'hide chaps")
    private val voidRange = set("Void ranger helm", "Void knight top", "Void knight robe", "Void knight gloves")
    private val eliteVoidRange = set("Void ranger helm", "Elite void top", "Elite void robe", "Void knight gloves")
    private val ahrims = set("Ahrim's hood", "Ahrim's robetop", "Ahrim's robeskirt")
    private val karils = set("Karil's coif", "Karil's leathertop", "Karil's leatherskirt")
    private val crystal = set("Crystal helm", "Crystal body", "Crystal legs")
    private val dharok = set("Dharok's helm", "Dharok's platebody", "Dharok's platelegs")
    private val ancestral = set("Ancestral hat", "Ancestral robe top", "Ancestral robe bottom")
    private val masori = set("Masori mask", "Masori body", "Masori chaps")
    private val torva = set("Torva full helm", "Torva platebody", "Torva platelegs")

    private val godCape = any("Saradomin cape", "Guthix cape", "Zamorak cape")
    private val imbuedGodCape = any("Saradomin cape(i)", "Guthix cape(i)", "Zamorak cape(i)")
    private val infernalOrFireCape = any("Infernal cape", "Fire cape")

    private val plans: Map<Pair<BotPvpRiskTier, BotPvpLoadoutRole>, Plan> = mapOf(
        (BotPvpRiskTier.Low to BotPvpLoadoutRole.Pure) to Plan(
            shared = listOf(elderChaos, one("Amulet of fury"), one("Ranger boots")),
            melee = listOf(one("Dragon scimitar")),
            ranged = listOf(one("Magic shortbow (i)")),
            specials = listOf(any("Dragon dagger", "Granite maul")),
        ),
        (BotPvpRiskTier.Low to BotPvpLoadoutRole.Magic) to Plan(
            shared = listOf(mystic, one("Amulet of glory"), godCape, one("Mystic boots")),
            magic = listOf(one("Ancient staff")),
        ),
        (BotPvpRiskTier.Low to BotPvpLoadoutRole.Ranged) to Plan(
            shared = listOf(
                sets(
                    listOf("Black d'hide body", "Black d'hide chaps", "Archer helm"),
                    listOf("Void ranger helm", "Void knight top", "Void knight robe", "Void knight gloves"),
                ),
                one("Ava's accumulator"),
                one("Amulet of glory"),
            ),
            ranged = listOf(any("Rune crossbow", "Magic shortbow (i)")),
            specials = listOf(one("Dark bow")),
        ),
        (BotPvpRiskTier.Low to BotPvpLoadoutRole.Melee) to Plan(
            shared = listOf(
                one("Helm of neitiznot"),
                one("Fighter torso"),
                one("Rune platelegs"),
                one("Rune boots"),
                one("Amulet of glory"),
                one("Fire cape"),
            ),
            melee = listOf(one("Abyssal whip")),
            specials = listOf(one("Armadyl godsword")),
        ),
        (BotPvpRiskTier.Low to BotPvpLoadoutRole.Hybrid) to Plan(
            magic = listOf(mystic, one("Ancient staff")),
            ranged = listOf(blackDhide, one("Rune crossbow")),
            melee = listOf(one("Dragon scimitar")),
            specials = listOf(one("Dragon dagger")),
        ),

        (BotPvpRiskTier.Average to BotPvpLoadoutRole.Pure) to Plan(
            shared = listOf(elderChaos, one("Amulet of fury"), one("Ranger boots")),
            magic = listOf(one("Ancient staff")),
            melee = listOf(one("Dragon scimitar")),
            ranged = listOf(one("Magic shortbow (i)")),
            specials = listOf(any("Dragon claws", "Granite maul")),
        ),
        (BotPvpRiskTier.Average to BotPvpLoadoutRole.Magic) to Plan(
            shared = listOf(
                ahrims,
                one("Amulet of glory"),
                imbuedGodCape,
                one("Infinity boots"),
                one("Barrows gloves"),
            ),
            magic = listOf(one("Toxic staff of the dead")),
        ),
        (BotPvpRiskTier.Average to BotPvpLoadoutRole.Ranged) to Plan(
            shared = listOf(
                sets(
                    listOf("Karil's coif", "Karil's leathertop", "Karil's leatherskirt"),
                    listOf("Void ranger helm", "Elite void top", "Elite void robe", "Void knight gloves"),
                ),
                one("Necklace of anguish"),
                one("Ava's assembler"),
            ),
            ranged = listOf(one("Dragon crossbow")),
            specials = listOf(one("Dark bow")),
        ),
        (BotPvpRiskTier.Average to BotPvpLoadoutRole.Melee) to Plan(
            shared = listOf(
                one("Helm of neitiznot"),
                one("Fighter torso"),
                one("Torag's platelegs"),
                one("Dragon boots"),
                one("Amulet of glory"),
            ),
            melee = listOf(one("Abyssal whip")),
            specials = listOf(any("Armadyl godsword", "Dragon claws")),
        ),
        (BotPvpRiskTier.Average to BotPvpLoadoutRole.Hybrid) to Plan(
            magic = listOf(ahrims, one("Toxic staff of the dead")),
            ranged = listOf(karils, one("Dragon crossbow")),
            melee = listOf(one("Abyssal whip")),
            specials = listOf(one("Armadyl godsword")),
        ),

        (BotPvpRiskTier.Risker to BotPvpLoadoutRole.Pure) to Plan(
            shared = listOf(elderChaos, one("Ranger boots")),
            magic = listOf(one("Occult necklace"), one("Volatile nightmare staff")),
            ranged = listOf(one("Necklace of anguish"), any("Armadyl crossbow", "Zaryte crossbow")),
            specials = listOf(one("Dragon claws"), one("Volatile nightmare staff")),
        ),
        (BotPvpRiskTier.Risker to BotPvpLoadoutRole.Magic) to Plan(
            shared = listOf(
                ahrims,
                one("Occult necklace"),
                imbuedGodCape,
                one("Eternal boots"),
                one("Tormented bracelet"),
            ),
            magic = listOf(any("Kodai wand", "Toxic staff of the dead")),
            specials = listOf(one("Volatile nightmare staff")),
        ),
        (BotPvpRiskTier.Risker to BotPvpLoadoutRole.Ranged) to Plan(
            shared = listOf(
                crystal,
                one("Necklace of anguish"),
                one("Ava's assembler"),
                one("Pegasian boots"),
            ),
            ranged = listOf(one("Bow of faerdhinen")),
            specials = listOf(any("Dark bow", "Heavy ballista")),
        ),
        (BotPvpRiskTier.Risker to BotPvpLoadoutRole.Melee) to Plan(
            shared = listOf(
                dharok,
                one("Amulet of torture"),
                infernalOrFireCape,
                one("Primordial boots"),
                one("Barrows gloves"),
            ),
            melee = listOf(
                any("Avernic defender", "Dragon defender"),
                one("Abyssal tentacle"),
            ),
            specials = listOf(any("Voidwaker", "Dragon claws", "Armadyl godsword")),
        ),
        (BotPvpRiskTier.Risker to BotPvpLoadoutRole.Hybrid) to Plan(
            magic = listOf(ahrims, any("Toxic staff of the dead", "Kodai wand")),
            ranged = listOf(crystal, one("Bow of faerdhinen")),
            melee = listOf(one("Dragon defender")),
            specials = listOf(one("Voidwaker")),
        ),

        (BotPvpRiskTier.Max to BotPvpLoadoutRole.Pure) to Plan(
            shared = listOf(elderChaos, one("Avernic treads"), one("Infernal cape")),
            magic = listOf(one("Occult necklace"), one("Volatile nightmare staff")),
            ranged = listOf(one("Necklace of anguish"), any("Armadyl crossbow", "Zaryte crossbow")),
            specials = listOf(one("Dragon claws"), one("Volatile nightmare staff")),
        ),
        (BotPvpRiskTier.Max to BotPvpLoadoutRole.Magic) to Plan(
            shared = listOf(
                ancestral,
                one("Occult necklace"),
                imbuedGodCape,
                one("Avernic treads"),
                one("Tormented bracelet"),
            ),
            magic = listOf(any("Kodai wand", "Toxic staff of the dead")),
            specials = listOf(one("Volatile nightmare staff")),
        ),
        (BotPvpRiskTier.Max to BotPvpLoadoutRole.Ranged) to Plan(
            shared = listOf(
                masori,
                one("Necklace of anguish"),
                one("Dizana's quiver"),
                one("Avernic treads"),
            ),
            ranged = listOf(one("Zaryte crossbow")),
            specials = listOf(any("Toxic blowpipe", "Dark bow")),
        ),
        (BotPvpRiskTier.Max to BotPvpLoadoutRole.Melee) to Plan(
            shared = listOf(
                torva,
                one("Amulet of rancour"),
                one("Infernal cape"),
                one("Avernic treads"),
                one("Ferocious gloves"),
            ),
            melee = listOf(
                one("Avernic defender"),
                any("Abyssal tentacle", "Ghrazi rapier"),
            ),
            specials = listOf(any("Voidwaker", "Dragon claws", "Armadyl godsword")),
        ),
        (BotPvpRiskTier.Max to BotPvpLoadoutRole.Hybrid) to Plan(
            magic = listOf(ancestral, any("Toxic staff of the dead", "Kodai wand")),
            ranged = listOf(masori, one("Zaryte crossbow")),
            melee = listOf(one("Avernic defender"), one("Voidwaker")),
            specials = listOf(one("Voidwaker")),
        ),
    )

    fun apply(loadout: BotPvpLoadout, assignment: BotPvpRiskAssignment): BotPvpLoadout {
        if (!loadout.members) return loadout
        val plan = plans[assignment.tier to assignment.role] ?: return loadout
        val levels = loadout.levels

        val styles = loadout.styles.mapValues { (style, base) ->
            val preferred = resolve(plan.forStyle(style), levels, exactOnly = false)
            mergeStyle(base, preferred)
        }

        val specials = resolve(plan.specials, levels, exactOnly = true)
            .map(ItemServerType::internalName)
            .distinct()

        return loadout.copy(
            styles = styles,
            specialWeapons = specials.ifEmpty { loadout.specialWeapons },
        )
    }

    private fun resolve(
        choices: List<Choice>,
        levels: Map<String, Int>,
        exactOnly: Boolean,
    ): List<ItemServerType> = choices.flatMap { choice ->
        choice.alternatives.mapNotNull { alternative ->
            val resolved = alternative.mapNotNull { name ->
                if (exactOnly) {
                    BotPvpEquipmentBudget.resolveExactUsable(name, levels)
                } else {
                    BotPvpEquipmentBudget.resolvePreferred(name, levels)
                }
            }
            resolved.takeIf { it.size == alternative.size }
        }.maxByOrNull { bundle -> bundle.sumOf(BotPvpEquipmentBudget::value) }.orEmpty()
    }

    private fun mergeStyle(base: List<String>, preferred: List<ItemServerType>): List<String> {
        val byWearpos = LinkedHashMap<Int, String>()
        val unresolved = ArrayList<String>()

        for (symbol in base) {
            val type = BotPvpEquipmentBudget.item(symbol)
            if (type == null || type.wearpos1 < 0) {
                unresolved += symbol
            } else {
                byWearpos[type.wearpos1] = symbol
            }
        }
        for (type in preferred) {
            if (type.wearpos1 >= 0) {
                byWearpos[type.wearpos1] = type.internalName
            }
        }
        return byWearpos.values.toList() + unresolved
    }
}
