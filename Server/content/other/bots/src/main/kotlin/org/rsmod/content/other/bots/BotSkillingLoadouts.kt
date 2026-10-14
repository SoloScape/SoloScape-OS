package org.rsmod.content.other.bots

/** Ordinary, uncharged tools: no quest, charge or special-tool prerequisites. */
internal object BotSkillingLoadouts {
    private data class Tier(val metal: String, val skill: Int, val attack: Int)

    private val tiers = listOf(
        Tier("Bronze", 1, 1), Tier("Iron", 1, 1), Tier("Steel", 6, 5),
        Tier("Black", 11, 10), Tier("Mithril", 21, 20), Tier("Adamant", 31, 30),
        Tier("Rune", 41, 40), Tier("Dragon", 61, 60),
    )

    val tools: List<String> = tiers.flatMap { listOf("${it.metal} axe", "${it.metal} pickaxe") }

    fun tool(kind: BotTaskKind, levels: Map<String, Int>): String {
        val mining = kind != BotTaskKind.Woodcutting
        val skill = levels[if (mining) "mining" else "woodcutting"] ?: 1
        val attack = levels["attack"] ?: 1
        val tier = tiers.last { skill >= it.skill && attack >= it.attack &&
            (it.metal != "Dragon" || levels["members"] == 1) }
        return "${tier.metal} ${if (mining) "pickaxe" else "axe"}"
    }

    fun outfit(task: BotTaskDefinition, levels: Map<String, Int>, style: Int): List<String> {
        val level = levels[task.skill] ?: 1
        val members = levels["members"] == 1
        val variant = style.mod(12)
        // Most experienced characters own skill outfits; some still use ordinary clothing.
        val experienced = members && level >= 40 && variant !in setOf(5, 8, 11)
        val clothes = when (task.kind) {
            BotTaskKind.Woodcutting -> if (experienced && level >= 44) set("ramble_lumberjack") else
                when (variant % 4) {
                    0 -> listOf("obj.leather_armour", "obj.leather_chaps", "obj.leather_boots")
                    1 -> listOf("obj.brown_apron", "obj.leather_chaps", "obj.leather_boots")
                    2 -> listOf("obj.desert_shirt", "obj.desert_robe", "obj.leather_boots")
                    else -> listOf("obj.leather_armour", "obj.desert_robe", "obj.leather_boots")
                }
            BotTaskKind.Mining -> if (experienced) set("motherlode_reward") else
                when (variant % 3) {
                    0 -> listOf("obj.brown_apron", "obj.leather_chaps", "obj.leather_boots")
                    1 -> listOf("obj.leather_armour", "obj.leather_chaps", "obj.leather_boots")
                    else -> listOf("obj.brown_apron", "obj.desert_robe", "obj.leather_boots")
                }
            BotTaskKind.Fishing -> if (experienced) set("trawler_reward") else if (members &&
                variant % 2 == 0) listOf("obj.desert_shirt", "obj.desert_robe", "obj.leather_boots") else
                listOf("obj.leather_armour", "obj.leather_chaps", "obj.leather_boots")
            BotTaskKind.Cooking -> listOf("obj.chefs_hat", "obj.white_apron",
                "obj.leather_chaps", "obj.leather_boots")
            BotTaskKind.Smelting, BotTaskKind.Smithing,
            BotTaskKind.Tanning, BotTaskKind.Crafting -> listOf("obj.brown_apron",
                "obj.leather_chaps", "obj.leather_boots", "obj.leather_vambraces")
            BotTaskKind.Runecrafting -> listOf("obj.wizards_robe", "obj.blue_skirt",
                "obj.leather_boots") + if (variant == 0) listOf("obj.bluewizhat") else
                task.requiredItems.keys.firstOrNull { it.endsWith(" talisman", true) }
                    ?.substringBefore(" ")?.lowercase()?.let { listOf("obj.tiara_$it") }
                    ?: listOf("obj.bluewizhat")
            else -> if (members && variant == 0)
                listOf("obj.desert_shirt", "obj.desert_robe", "obj.desert_boots") else
                listOf("obj.brown_apron", "obj.leather_chaps", "obj.leather_boots")
        }
        val cape = when {
            members && level >= 99 && task.skill != null -> "obj.skillcape_${task.skill}"
            task.kind in setOf(BotTaskKind.Fishing, BotTaskKind.Cooking,
                BotTaskKind.Smelting, BotTaskKind.Smithing) -> null
            variant in setOf(0, 3, 7) -> when (task.kind) {
                BotTaskKind.Woodcutting -> "obj.green_cape"
                BotTaskKind.Runecrafting -> "obj.blue_cape"
                else -> "obj.black_cape"
            }
            else -> null
        }
        return clothes + listOfNotNull(cape)
    }

    private fun set(prefix: String): List<String> =
        listOf("hat", "top", "legs", "boots").map { "obj.${prefix}_$it" }
}
