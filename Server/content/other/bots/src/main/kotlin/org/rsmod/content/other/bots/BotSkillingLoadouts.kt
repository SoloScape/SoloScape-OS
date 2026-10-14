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

    fun outfit(defence: Int, style: Int): List<String> = when (style.mod(3)) {
        0 -> {
            val metal = when {
                defence >= 40 -> "Rune"
                defence >= 30 -> "Adamant"
                defence >= 20 -> "Mithril"
                defence >= 5 -> "Steel"
                else -> "Iron"
            }
            listOf("$metal full helm", "$metal chainbody", "$metal platelegs")
        }
        1 -> listOf("obj.bluewizhat", "obj.wizards_robe", "obj.blue_skirt")
        else -> listOf("obj.leather_armour", "obj.leather_chaps", "obj.leather_vambraces")
    } + listOf("obj.leather_boots", "obj.red_cape")
}
