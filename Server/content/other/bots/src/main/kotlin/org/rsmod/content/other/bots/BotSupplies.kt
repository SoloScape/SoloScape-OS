package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.types.ItemServerType
import jakarta.inject.Inject
import java.util.Collections
import java.util.WeakHashMap
import kotlin.random.Random
import org.rsmod.api.invtx.invAdd
import org.rsmod.api.invtx.invTransfer
import org.rsmod.api.player.worn.HeldEquipOp
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.Inventory
import org.rsmod.game.type.getInvObj

class BotSupplies @Inject constructor(private val equipment: HeldEquipOp) {
    private data class CombatLoadout(
        val attack: Int,
        val defence: Int,
        val strength: Int = 1,
        val members: Boolean = false,
        val items: List<String>,
    )

    private val seeded = Collections.newSetFromMap(WeakHashMap<Player, Boolean>())
    private val random = Random.Default
    private val combatLoadouts = listOf(
        CombatLoadout(1, 1, items = listOf(
            "Steel sword", "Steel full helm", "Steel platebody", "Steel platelegs",
            "Steel kiteshield", "Amulet of strength",
        )),
        CombatLoadout(30, 30, items = listOf(
            "Adamant scimitar", "Adamant full helm", "Adamant platebody", "Adamant platelegs",
            "Adamant kiteshield", "Amulet of strength",
        )),
        CombatLoadout(40, 40, items = listOf(
            "Rune scimitar", "Rune full helm", "Rune platebody", "Rune platelegs",
            "Rune kiteshield", "Amulet of power",
        )),
        CombatLoadout(50, 40, strength = 50, members = true, items = listOf(
            "Granite maul", "Rune full helm", "Rune platebody", "Rune platelegs",
            "Amulet of glory", "Climbing boots",
        )),
        CombatLoadout(60, 40, members = true, items = listOf(
            "Dragon scimitar", "Rune full helm", "Rune platebody", "Rune platelegs",
            "Rune kiteshield", "Amulet of glory", "Climbing boots",
        )),
        CombatLoadout(60, 40, members = true, items = listOf(
            "Dragon longsword", "Rune full helm", "Rune platebody", "Rune platelegs",
            "Rune kiteshield", "Amulet of glory", "Rune boots",
        )),
        CombatLoadout(70, 40, members = true, items = listOf(
            "Abyssal whip", "Rune full helm", "Rune platebody", "Rune platelegs",
            "Rune kiteshield", "Amulet of glory", "Rune boots",
        )),
    )
    private val memberAccessories = listOf(
        "Amulet of glory", "Combat bracelet", "Obsidian cape", "Rune boots", "Climbing boots",
    )

    fun requirements(task: BotTaskDefinition, levels: Map<String, Int>): Map<String, Int> {
        val result = task.requiredItems.toMutableMap()
        when (task.kind) {
            BotTaskKind.Woodcutting -> result.putIfAbsent("Bronze axe", 1)
            BotTaskKind.Mining -> result.putIfAbsent("Bronze pickaxe", 1)
            BotTaskKind.Fishing -> when (task.option.lowercase()) {
                "lure" -> {
                    result.putIfAbsent("Fly fishing rod", 1)
                    result.putIfAbsent("Feather", 200)
                }
                "bait" -> {
                    result.putIfAbsent("Fishing rod", 1)
                    result.putIfAbsent("Fishing bait", 200)
                }
                "cage" -> result.putIfAbsent("Lobster pot", 1)
                "harpoon" -> result.putIfAbsent("Harpoon", 1)
                else -> result.putIfAbsent("Small fishing net", 1)
            }
            BotTaskKind.Cooking -> result[rawFood(levels["cooking"] ?: 1)] = 28
            BotTaskKind.Smelting -> {
                result["Iron ore"] = 9
                result["Coal"] = 18
            }
            BotTaskKind.Smithing -> {
                result["Hammer"] = 1
                result["Steel bar"] = 27
            }
            BotTaskKind.Runecrafting -> {
                if (task.id.contains("Essence", true)) result.putIfAbsent("Bronze pickaxe", 1)
                else {
                    result["Rune essence"] = 27
                    val rune = task.id.substringBefore("Rune").lowercase()
                    result.putIfAbsent("${rune.replaceFirstChar(Char::uppercase)} talisman", 1)
                }
            }
            BotTaskKind.Shearing -> result["Shears"] = 1
            BotTaskKind.Spinning -> result[if (task.id.contains("Flax")) "Flax" else "Wool"] = 28
            BotTaskKind.Tanning -> {
                result["Cowhide"] = 27
                result["Coins"] = 1000
            }
            BotTaskKind.Crafting -> {
                result["Needle"] = 1
                result["Thread"] = 200
                result["Leather"] = 26
            }
            BotTaskKind.Shop -> result["Coins"] = 1000
            else -> Unit
        }
        return result
    }

    fun seed(player: Player, task: BotTaskDefinition?, progressive: Boolean) {
        if (!seeded.add(player)) return
        val levels = levels(player)
        val bank = player.invMap.getOrPut("inv.bank")
        if (progressive) {
            for (item in listOf("Bronze axe", "Bronze pickaxe", "Small fishing net", "Shears")) {
                add(player, bank, item, 1)
            }
            add(player, player.inv, "Bronze sword", 1)
            add(player, player.inv, "Wooden shield", 1)
            add(player, bank, "Coins", 1000)
        } else {
            val stock = linkedMapOf(
                "Bronze axe" to 1, "Bronze pickaxe" to 1, "Small fishing net" to 1,
                "Fly fishing rod" to 1, "Fishing rod" to 1, "Lobster pot" to 1,
                "Harpoon" to 1, "Hammer" to 1, "Needle" to 1, "Shears" to 1,
                "Feather" to 5000, "Fishing bait" to 5000, "Thread" to 5000,
                "Coins" to 100000, "Raw lobster" to 5000, "Raw shrimps" to 5000,
                "Iron ore" to 5000, "Coal" to 10000, "Steel bar" to 5000,
                "Flax" to 5000, "Wool" to 5000, "Cowhide" to 5000,
                "Leather" to 5000, "Rune essence" to 5000,
            )
            for ((item, count) in stock) add(player, bank, item, count)
            if (task != null) {
                for ((item, count) in requirements(task, levels)) {
                    add(player, bank, item, count.coerceAtLeast(1))
                }
            }
            if (task?.kind == BotTaskKind.Combat) {
                seedCombatEquipment(player)
            } else {
                add(player, player.inv, "Steel sword", 1)
                add(player, player.inv, "Steel kiteshield", 1)
            }
        }
        for (slot in player.inv.indices) {
            if (player.inv[slot] != null) equipment.equip(player, slot, player.inv)
        }
        if (!progressive && task?.kind == BotTaskKind.Combat) {
            add(player, player.inv, if (player.members) "Shark" else "Lobster", 12)
        }
        player.rebuildAppearance()
        if (task != null) {
            for ((item, requested) in requirements(task, levels)) {
                val type = resolve(item) ?: continue
                val slot = bank.indices.firstOrNull { bank[it]?.id == type.id } ?: continue
                val available = bank[slot]?.count ?: continue
                val free = player.inv.indices.count { player.inv[it] == null }
                val amount = minOf(requested, available, if (type.stackable) requested else free)
                if (amount <= 0) continue
                val transaction = player.invTransfer(
                    bank, slot, amount, player.inv, strict = true, autoCommit = false
                )
                if (transaction.success) transaction.commitAll()
            }
        }
        if (task != null) equipRequired(player, task)
    }

    fun replenish(player: Player, task: BotTaskDefinition, actions: BotActions): Boolean {
        val bank = player.invMap.getOrPut("inv.bank")
        var supplied = true
        for ((item, count) in requirements(task, levels(player))) {
            val inInventory = count(player.inv, item) + count(player.worn, item)
            if (inInventory >= count) continue
            val available = count(bank, item)
            if (available == 0) {
                supplied = false
                continue
            }
            val type = resolve(item) ?: continue
            val free = player.inv.indices.count { player.inv[it] == null }
            val amount = minOf(count - inInventory, available, if (type.stackable) count else free)
            if (amount > 0 && !actions.withdraw(player, item, amount)) supplied = false
        }
        equipRequired(player, task)
        return supplied && canSupply(player, task)
    }

    fun canSupply(player: Player, task: BotTaskDefinition): Boolean {
        val bank = player.invMap.getOrPut("inv.bank")
        return requirements(task, levels(player)).keys.all {
            count(player.inv, it) + count(player.worn, it) + count(bank, it) > 0
        }
    }

    fun perform(player: Player, task: BotTaskDefinition, actions: BotActions): Boolean =
        when (task.kind) {
            BotTaskKind.Cooking -> {
                val raw = player.inv.objs.filterNotNull().map(::getInvObj)
                    .firstOrNull { it.name.startsWith("Raw ", true) }
                raw != null && actions.useItemOnLoc(player, raw.name, task.targets)
            }
            BotTaskKind.Smelting -> actions.operate(player, task.targets, "Smelt")
            BotTaskKind.Smithing -> actions.useItemOnLoc(player, "Steel bar", task.targets)
            BotTaskKind.Spinning -> actions.operate(player, task.targets, "Spin")
            BotTaskKind.Tanning -> actions.operate(player, task.targets, "Trade")
            BotTaskKind.Crafting -> actions.useItems(player, "Needle", "Leather")
            BotTaskKind.Runecrafting -> {
                if (task.id.contains("Essence", true)) {
                    actions.operate(player, setOf("Rune Essence", "Pure essence", "Rune essence"), "Mine") ||
                        actions.operate(player, setOf("Aubury", "Sedridor"), "Teleport")
                } else {
                    val talisman = player.inv.objs.filterNotNull().map(::getInvObj)
                        .firstOrNull { it.name.endsWith("talisman", true) }
                    actions.operate(player, setOf("Altar"), "Craft-rune") ||
                        (talisman != null &&
                            actions.useItemOnLoc(player, talisman.name, setOf("Mysterious ruins")))
                }
            }
            else -> actions.operate(player, task.targets, task.option)
        }

    private fun seedCombatEquipment(player: Player) {
        val attack = player.statMap.getBaseLevel("stat.attack").toInt()
        val defence = player.statMap.getBaseLevel("stat.defence").toInt()
        val strength = player.statMap.getBaseLevel("stat.strength").toInt()
        val eligible = combatLoadouts.filter {
            attack >= it.attack && defence >= it.defence && strength >= it.strength &&
                (!it.members || player.members)
        }
        val memberEligible = eligible.filter { it.members }
        val pool = if (player.members && memberEligible.isNotEmpty() && random.nextInt(100) < 75) {
            memberEligible
        } else {
            eligible
        }
        val loadout = pool.randomOrNull(random) ?: combatLoadouts.first()
        for (item in loadout.items) add(player, player.inv, item, 1)
        if (player.members) {
            memberAccessories.filterNot { it in loadout.items }.randomOrNull(random)?.let {
                add(player, player.inv, it, 1)
            }
        }
    }

    private fun equipRequired(player: Player, task: BotTaskDefinition) {
        val required = requirements(task, levels(player)).keys
        for (slot in player.inv.indices) {
            val obj = player.inv[slot] ?: continue
            val type = getInvObj(obj)
            if (type.isEquipable && required.any { type.name.equals(it, true) }) {
                equipment.equip(player, slot, player.inv)
            }
        }
        player.rebuildAppearance()
    }

    private fun add(player: Player, inv: Inventory, name: String, count: Int) {
        val type = resolve(name) ?: return
        player.invAdd(inv, type.id, count)
    }

    private fun count(inv: Inventory, name: String): Int =
        inv.objs.filterNotNull().filter { getInvObj(it).name.equals(name, true) }.sumOf { it.count }

    private fun resolve(name: String): ItemServerType? =
        ServerCacheManager.getItemTypes().firstOrNull {
            it.certtemplate == 0 && it.name.equals(name, true)
        }

    private fun levels(player: Player): Map<String, Int> =
        mapOf(
            "cooking" to player.statMap.getBaseLevel("stat.cooking").toInt(),
            "smithing" to player.statMap.getBaseLevel("stat.smithing").toInt(),
        )

    private fun rawFood(cooking: Int): String = if (cooking >= 40) "Raw lobster" else "Raw shrimps"
}
