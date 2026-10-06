package org.rsmod.content.other.bots

/**
 * Player-authored Wilderness PK risk/loadout matrix.
 *
 * This is deliberately kept separate from the pinned TSPS archetype/stat catalog. The TSPS
 * variants still decide population, stats, spellbooks and hotspot eligibility; this table is the
 * native SoloScape target gear/supply matrix that can be resolved onto those variants.
 */
enum class BotPvpRiskTier {
    Low,
    Average,
    Risker,
    Max;

    companion object {
        fun fromDifficulty(difficulty: BotPvpDifficulty): BotPvpRiskTier = when (difficulty) {
            BotPvpDifficulty.Novice -> Low
            BotPvpDifficulty.Standard -> Average
            BotPvpDifficulty.Veteran -> Risker
            BotPvpDifficulty.Elite -> Max
        }
    }
}

enum class BotPvpLoadoutRole {
    Pure,
    Magic,
    Ranged,
    Melee,
    Hybrid,
}

data class BotPvpRiskPreset(
    val tier: BotPvpRiskTier,
    val role: BotPvpLoadoutRole,
    val gear: List<String>,
    val supplies: List<String>,
    val preferUnskulled: Boolean = false,
)

object BotPvpRiskLoadouts {
    private fun p(
        tier: BotPvpRiskTier,
        role: BotPvpLoadoutRole,
        gear: String,
        supplies: String,
        preferUnskulled: Boolean = false,
    ) = BotPvpRiskPreset(
        tier = tier,
        role = role,
        gear = gear.split(", ").map(String::trim),
        supplies = supplies.split(", ").map(String::trim),
        preferUnskulled = preferUnskulled,
    )

    /**
     * Exact requested loadout intent. Names here are human-facing on purpose; the runtime resolver
     * can map them to verified gamevals and provide explicit fallbacks where the cache has no exact
     * item (for example blighted ranging potions).
     */
    val all: List<BotPvpRiskPreset> = listOf(
        p(
            BotPvpRiskTier.Low, BotPvpLoadoutRole.Pure,
            "Elder chaos robes, Amulet of fury, Ranger boots, Dragon scimitar, Dragon dagger, Granite maul, Magic shortbow (i)",
            "Shark, Cooked karambwan, Super combat potion, Blighted ranging potion, Prayer potion",
        ),
        p(
            BotPvpRiskTier.Low, BotPvpLoadoutRole.Magic,
            "Mystic robes, Amulet of glory, God cape, Mystic boots, Ancient staff",
            "Shark, Cooked karambwan, Magic potion, Prayer potion, Super restore",
        ),
        p(
            BotPvpRiskTier.Low, BotPvpLoadoutRole.Ranged,
            "Black dragonhide / Void, Archer helm, Ava's accumulator, Amulet of glory, Rune crossbow, Magic shortbow (i), Dark bow",
            "Shark, Cooked karambwan, Blighted ranging potion, Prayer potion",
        ),
        p(
            BotPvpRiskTier.Low, BotPvpLoadoutRole.Melee,
            "Helm of Neitiznot, Fighter torso, Rune platelegs, Rune boots, Amulet of glory, Fire cape, Abyssal whip, Armadyl godsword",
            "Shark, Cooked karambwan, Super combat potion(4), Prayer potion",
        ),
        p(
            BotPvpRiskTier.Low, BotPvpLoadoutRole.Hybrid,
            "Mystic switches, Black dragonhide switches, Ancient staff, Rune crossbow, Dragon scimitar, Dragon dagger",
            "Shark, Cooked karambwan, Super combat potion, Blighted ranging potion, Magic potion, Prayer potion",
        ),

        p(
            BotPvpRiskTier.Average, BotPvpLoadoutRole.Pure,
            "Elder chaos robes, Amulet of fury, Ranger boots, Dragon scimitar, Dragon claws, Granite maul, Magic shortbow (i), Ancient staff",
            "Dark crab, Shark, Cooked karambwan, Super combat potion(4), Blighted ranging potion, Super restore",
        ),
        p(
            BotPvpRiskTier.Average, BotPvpLoadoutRole.Magic,
            "Ahrim's, Amulet of glory, Imbued god cape, Infinity, Barrows gloves, Toxic staff of the dead",
            "Dark crab, Shark, Cooked karambwan, Magic potion, Saradomin brew, Super restore",
        ),
        p(
            BotPvpRiskTier.Average, BotPvpLoadoutRole.Ranged,
            "Karil's / Elite void, Necklace of anguish, Ava's assembler, Dragon crossbow, Dark bow",
            "Dark crab, Shark, Cooked karambwan, Blighted ranging potion, Super restore",
        ),
        p(
            BotPvpRiskTier.Average, BotPvpLoadoutRole.Melee,
            "Helm of Neitiznot, Fighter torso, Torag's platelegs, Dragon boots, Amulet of glory, Abyssal whip, Armadyl godsword, Dragon claws",
            "Dark crab, Shark, Cooked karambwan, Super combat potion(4), Super restore",
        ),
        p(
            BotPvpRiskTier.Average, BotPvpLoadoutRole.Hybrid,
            "Ahrim's switches, Karil's switches, Toxic staff of the dead, Dragon crossbow, Abyssal whip, Armadyl godsword",
            "Dark crab, Shark, Cooked karambwan, Anglerfish, Saradomin brew, Super restore, Super combat potion(4), Blighted ranging potion",
        ),

        p(
            BotPvpRiskTier.Risker, BotPvpLoadoutRole.Pure,
            "Elder chaos robes, Occult necklace / Necklace of anguish switches, Ranger boots, Volatile nightmare staff, Dragon claws, Armadyl crossbow / Zaryte crossbow",
            "Anglerfish, Dark crab, Cooked karambwan, Saradomin brew, Super restore, Super combat potion, Ranging potion",
        ),
        p(
            BotPvpRiskTier.Risker, BotPvpLoadoutRole.Magic,
            "Ahrim's, Occult necklace, Imbued god cape, Eternal boots, Tormented bracelet, Kodai wand / Toxic staff of the dead, Volatile nightmare staff",
            "Anglerfish, Dark crab, Cooked karambwan, Saradomin brew, Super restore, Magic potion",
        ),
        p(
            BotPvpRiskTier.Risker, BotPvpLoadoutRole.Ranged,
            "Crystal armour, Necklace of anguish, Ava's assembler, Pegasian boots, Bow of Faerdhinen, Dark bow / Heavy ballista",
            "Anglerfish, Dark crab, Cooked karambwan, Saradomin brew, Super restore, Ranging potion",
        ),
        p(
            BotPvpRiskTier.Risker, BotPvpLoadoutRole.Melee,
            "Dharok's, Amulet of torture, Infernal cape / Fire cape, Primordial boots, Barrows gloves, Avernic defender / Dragon defender, Abyssal tentacle, Voidwaker / Dragon claws / Armadyl godsword",
            "Anglerfish, Dark crab, Cooked karambwan, Saradomin brew, Super restore, Super combat potion",
        ),
        p(
            BotPvpRiskTier.Risker, BotPvpLoadoutRole.Hybrid,
            "Crystal switches, Ahrim's switches, Toxic staff of the dead / Kodai wand, Bow of Faerdhinen, Voidwaker, Dragon defender",
            "Anglerfish, Dark crab, Cooked karambwan, Saradomin brew, Super restore, Super combat potion, Ranging potion",
        ),

        p(
            BotPvpRiskTier.Max, BotPvpLoadoutRole.Pure,
            "Elder chaos robes, Occult necklace / Necklace of anguish switches, Avernic treads, Volatile nightmare staff, Infernal cape, Dragon claws, Armadyl crossbow / Zaryte crossbow",
            "Anglerfish, Dark crab, Cooked karambwan, Saradomin brew, Super restore, Super combat potion, Ranging potion",
            preferUnskulled = true,
        ),
        p(
            BotPvpRiskTier.Max, BotPvpLoadoutRole.Magic,
            "Ancestral, Occult necklace, Imbued god cape, Avernic treads, Tormented bracelet, Kodai wand / Toxic staff of the dead, Volatile nightmare staff",
            "Anglerfish, Dark crab, Cooked karambwan, Saradomin brew, Super restore, Magic potion",
            preferUnskulled = true,
        ),
        p(
            BotPvpRiskTier.Max, BotPvpLoadoutRole.Ranged,
            "Masori, Necklace of anguish, Dizana's quiver, Avernic treads, Zaryte crossbow, Toxic blowpipe / Dark bow",
            "Anglerfish, Dark crab, Cooked karambwan, Saradomin brew, Super restore, Ranging potion",
            preferUnskulled = true,
        ),
        p(
            BotPvpRiskTier.Max, BotPvpLoadoutRole.Melee,
            "Torva, Amulet of rancour, Infernal cape, Avernic treads, Ferocious gloves, Avernic defender, Abyssal tentacle / Ghrazi rapier, Voidwaker / Dragon claws / Armadyl godsword",
            "Anglerfish, Dark crab, Cooked karambwan, Saradomin brew, Super restore, Super combat potion",
            preferUnskulled = true,
        ),
        p(
            BotPvpRiskTier.Max, BotPvpLoadoutRole.Hybrid,
            "Ancestral switches, Masori switches, Toxic staff of the dead / Kodai wand, Zaryte crossbow, Voidwaker, Avernic defender",
            "Anglerfish, Dark crab, Cooked karambwan, Saradomin brew, Super restore, Super combat potion, Ranging potion",
            preferUnskulled = true,
        ),
    )

    private val byTierRole = all.associateBy { it.tier to it.role }

    fun get(tier: BotPvpRiskTier, role: BotPvpLoadoutRole): BotPvpRiskPreset =
        checkNotNull(byTierRole[tier to role]) { "Missing PvP risk preset for $tier/$role" }

    fun get(difficulty: BotPvpDifficulty, role: BotPvpLoadoutRole): BotPvpRiskPreset =
        get(BotPvpRiskTier.fromDifficulty(difficulty), role)
}
