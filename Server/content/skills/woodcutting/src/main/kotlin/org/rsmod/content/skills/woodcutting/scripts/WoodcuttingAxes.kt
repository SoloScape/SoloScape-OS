package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import org.rsmod.api.obj.charges.ObjChargeManager
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory
import org.rsmod.game.type.getInvObj
import org.rsmod.utils.bits.withBits

object WoodcuttingAxes {
    const val MAX_CRYSTAL = 20_000
    const val MAX_INFERNAL = 5_000
    const val CHARGE_VAROBJ = "varobj.crystal_weapon_charges"

    val fellingConversions = listOf(
        "bronze", "iron", "steel", "black", "mithril", "adamant", "rune", "dragon", "3a",
    ).associate { "obj.${it}_axe" to "obj.${it}_axe_2h" } + mapOf(
        "obj.crystal_axe" to "obj.crystal_axe_2h",
        "obj.crystal_axe_inactive" to "obj.crystal_axe_2h_inactive",
    )

    fun isFelling(name: String): Boolean = name in fellingConversions.values

    fun isCrystal(name: String): Boolean = name.startsWith("obj.crystal_axe")

    fun isCharged(name: String): Boolean =
        name == "obj.infernal_axe" || name == "obj.crystal_axe" || name == "obj.crystal_axe_2h"

    fun baseName(name: String): String = when (name) {
        "obj.infernal_axe_empty", "obj.crystal_axe_inactive",
        "obj.crystal_axe_2h_inactive" -> "obj.dragon_axe"
        "obj.crystal_axe_2h" -> "obj.crystal_axe"
        else -> fellingConversions.entries.find { it.value == name }?.key ?: name
    }

    fun charges(axe: InvObj): Int = ObjChargeManager().getCharges(axe, CHARGE_VAROBJ)

    fun withCharges(axe: InvObj, count: Int): InvObj {
        require(count in 0..MAX_CRYSTAL)
        val bits = ServerCacheManager.getVarObj(CHARGE_VAROBJ.asRSCM(RSCMType.VAROBJ))!!.bits
        return axe.copy(vars = axe.vars.withBits(bits, count))
    }

    fun inactiveName(name: String): String = when (name) {
        "obj.infernal_axe" -> "obj.infernal_axe_empty"
        "obj.crystal_axe_2h" -> "obj.crystal_axe_2h_inactive"
        "obj.crystal_axe" -> "obj.crystal_axe_inactive"
        else -> name
    }

    fun effectiveType(axe: InvObj): ItemServerType {
        val name = getInvObj(axe).internalName
        val effective = if (isCharged(name) && charges(axe) == 0) "obj.dragon_axe" else baseName(name)
        return ServerCacheManager.getItem(effective.asRSCM(RSCMType.OBJ))!!
    }

    fun animation(name: String): String? {
        if (!isFelling(name)) return null
        val metal = when (name) {
            "obj.crystal_axe_2h" -> "crystal"
            "obj.crystal_axe_2h_inactive" -> "crystal_inactive"
            else -> name.removePrefix("obj.").removeSuffix("_axe_2h")
        }
        return "seq.forestry_2h_axe_chopping_$metal"
    }

    fun chargeCrystal(inventory: Inventory, slot: Int, shards: Int): Boolean {
        val axe = inventory[slot] ?: return false
        val name = getInvObj(axe).internalName
        if (!isCrystal(name) || shards <= 0) return false
        val current = charges(axe)
        if (current >= MAX_CRYSTAL || shards > (MAX_CRYSTAL - current + 99) / 100) return false
        val fuelId = "obj.prif_crystal_shard".asRSCM(RSCMType.OBJ)
        val fuelSlots = inventory.indices.filter { inventory[it]?.id == fuelId }
        if (fuelSlots.sumOf { inventory.getValue(it).count.toLong() } < shards) return false
        var remove = shards
        for (fuelSlot in fuelSlots) {
            val fuel = inventory.getValue(fuelSlot)
            val used = minOf(remove, fuel.count)
            inventory[fuelSlot] = if (used == fuel.count) null else fuel.copy(count = fuel.count - used)
            remove -= used
            if (remove == 0) break
        }
        inventory[slot] = withCharges(InvObj(name.removeSuffix("_inactive"), vars = axe.vars),
            minOf(MAX_CRYSTAL, current + shards * 100))
        return true
    }

    fun revertCrystal(inventory: Inventory, slot: Int): Boolean {
        val axe = inventory[slot] ?: return false
        val name = getInvObj(axe).internalName
        if (!isCrystal(name)) return false
        val seedSlot = inventory.indices.firstOrNull { inventory[it] == null } ?: return false
        inventory[slot] = InvObj(if (isFelling(name)) "obj.dragon_axe_2h" else "obj.dragon_axe")
        inventory[seedSlot] = InvObj("obj.prif_tool_seed")
        return true
    }

    fun unchargeCrystal(inventory: Inventory, slot: Int): Boolean {
        val axe = inventory[slot] ?: return false
        val name = getInvObj(axe).internalName
        if (!isCrystal(name)) return false
        inventory[slot] = withCharges(InvObj(inactiveName(name), vars = axe.vars), 0)
        return true
    }

    fun createInfernal(inventory: Inventory, slot: Int, stoneSlot: Int): Boolean {
        val axe = inventory[slot] ?: return false
        val stone = inventory[stoneSlot] ?: return false
        if (getInvObj(axe).internalName != "obj.dragon_axe" ||
            getInvObj(stone).internalName != "obj.smouldering_stone") return false
        inventory[stoneSlot] = if (stone.count == 1) null else stone.copy(count = stone.count - 1)
        inventory[slot] = withCharges(InvObj("obj.infernal_axe", vars = axe.vars), MAX_INFERNAL)
        return true
    }

    fun rechargeInfernal(inventory: Inventory, slot: Int, fuelSlot: Int): Boolean {
        val axe = inventory[slot] ?: return false
        if (getInvObj(axe).internalName !in listOf("obj.infernal_axe", "obj.infernal_axe_empty") ||
            charges(axe) >= MAX_INFERNAL) return false
        val fuel = inventory[fuelSlot] ?: return false
        if (getInvObj(fuel).internalName !in listOf("obj.dragon_axe", "obj.smouldering_stone")) return false
        inventory[fuelSlot] = if (fuel.count == 1) null else fuel.copy(count = fuel.count - 1)
        inventory[slot] = withCharges(InvObj("obj.infernal_axe", vars = axe.vars), MAX_INFERNAL)
        return true
    }

    fun attachHandle(inventory: Inventory, slot: Int, besideAnvil: Boolean,
        besideSingingBowl: Boolean = false, smithingLevel: Int = 0, craftingLevel: Int = 0): Boolean {
        val axe = inventory[slot] ?: return false
        val name = getInvObj(axe).internalName
        val output = fellingConversions[name] ?: return false
        if (isCrystal(name)) {
            if (!besideSingingBowl || smithingLevel < 76 || craftingLevel < 76) return false
        } else if (!besideAnvil || "obj.hammer" !in inventory) return false
        val handleId = "obj.forestry_2h_axe_handle".asRSCM(RSCMType.OBJ)
        val handleSlot = inventory.indices.firstOrNull { inventory[it]?.id == handleId } ?: return false
        val handle = inventory.getValue(handleSlot)
        inventory[handleSlot] = if (handle.count == 1) null else handle.copy(count = handle.count - 1)
        inventory[slot] = InvObj(output, vars = axe.vars)
        return true
    }

    fun consume(player: Player, axe: InvObj): Boolean {
        val inventory = if (player.worn.any { it === axe }) player.worn else player.inv
        val slot = (0 until inventory.size).firstOrNull { inventory[it] === axe } ?: return false
        return consume(inventory, slot)
    }

    fun consume(inventory: Inventory, slot: Int): Boolean {
        val axe = inventory[slot] ?: return false
        val name = getInvObj(axe).internalName
        if (!isCharged(name)) return false
        val remaining = charges(axe)
        val updated = withCharges(axe, (remaining - 1).coerceAtLeast(0))
        inventory[slot] = if (remaining <= 1) {
            InvObj(inactiveName(name), vars = updated.vars)
        } else updated
        return remaining > 0
    }
}
