package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import kotlin.math.min
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.righthand
import org.rsmod.api.player.stat.statBase
import org.rsmod.api.player.stat.smithingLvl
import org.rsmod.api.player.stat.craftingLvl
import org.rsmod.api.repo.loc.LocRepository
import org.rsmod.api.script.onOpHeld1
import org.rsmod.api.script.onOpHeld3
import org.rsmod.api.script.onOpHeld4
import org.rsmod.api.script.onOpHeld5
import org.rsmod.api.script.onOpHeldU
import org.rsmod.api.script.onOpWorn2
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory
import org.rsmod.game.type.getInvObj
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class AxeInteractions @Inject constructor(private val locRepo: LocRepository) : PluginScript() {
    override fun ScriptContext.startup() {
        for (axe in CRYSTAL_AXES) {
            onOpHeldU(SHARD, axe) { chargeCrystal(it.secondSlot) }
        }
        for ((axe, output) in WoodcuttingAxes.fellingConversions) {
            onOpHeldU(HANDLE, axe) { attachHandle(it.secondSlot, output) }
        }
        onOpHeldU("obj.smouldering_stone", "obj.dragon_axe") {
            createInfernal(it.secondSlot, it.firstSlot)
        }
        for (axe in listOf("obj.infernal_axe", "obj.infernal_axe_empty")) {
            for (fuel in listOf("obj.dragon_axe", "obj.smouldering_stone")) {
                onOpHeldU(fuel, axe) { rechargeInfernal(it.secondSlot, fuel, it.firstSlot) }
            }
        }
        for (axe in CRYSTAL_AXES + listOf("obj.infernal_axe", "obj.infernal_axe_empty")) {
            val type = ServerCacheManager.getItem(axe.asRSCM(RSCMType.OBJ))!!
            for ((index, option) in type.interfaceOptions.withIndex()) {
                if (option?.lowercase() !in setOf("check", "check-charges", "uncharge", "revert")) continue
                when (index + 1) {
                    1 -> onOpHeld1(axe) { handleOption(it.inventory, it.slot, option!!) }
                    3 -> onOpHeld3(axe) { handleOption(it.inventory, it.slot, option!!) }
                    4 -> onOpHeld4(axe) { handleOption(it.inventory, it.slot, option!!) }
                    5 -> onOpHeld5(axe) { handleOption(it.inventory, it.slot, option!!) }
                }
            }
            onOpWorn2(axe) { checkCharges(player.righthand) }
        }
    }

    private fun ProtectedAccess.checkCharges(axe: InvObj?) {
        if (axe == null) return
        mes("Your ${getInvObj(axe).name.lowercase()} has ${WoodcuttingAxes.charges(axe)} charges remaining.")
    }

    private suspend fun ProtectedAccess.handleOption(inventory: Inventory, slot: Int, option: String) {
        when (option.lowercase()) {
            "check", "check-charges" -> checkCharges(inventory[slot])
            "uncharge" -> uncharge(inventory, slot)
            "revert" -> revert(inventory, slot)
        }
    }

    private suspend fun ProtectedAccess.chargeCrystal(slot: Int) {
        val axe = inv[slot] ?: return
        val name = getInvObj(axe).internalName
        if (name !in CRYSTAL_AXES) return
        val current = WoodcuttingAxes.charges(axe)
        val maxShards = (WoodcuttingAxes.MAX_CRYSTAL - current + 99) / 100
        val available = min(maxShards, invTotal(inv, SHARD))
        if (available <= 0) {
            mes("Your axe is fully charged.")
            return
        }
        val requested = countDialog("How many crystal shards? (Up to $available)")
            .coerceIn(0, available)
        if (requested == 0 || inv[slot] != axe) return
        if (!WoodcuttingAxes.chargeCrystal(inv, slot, requested)) return
        checkCharges(inv[slot])
    }

    private suspend fun ProtectedAccess.uncharge(inventory: Inventory, slot: Int) {
        val axe = inventory[slot] ?: return
        val name = getInvObj(axe).internalName
        if (!WoodcuttingAxes.isCrystal(name)) return
        if (!choice2("Uncharge.", true, "Cancel.", false,
                title = "Remove all charges? Crystal shards will not be refunded.")) return
        if (inventory[slot] != axe) return
        if (!WoodcuttingAxes.unchargeCrystal(inventory, slot)) return
        mes("You remove all charges from your axe.")
    }

    private suspend fun ProtectedAccess.revert(inventory: Inventory, slot: Int) {
        val axe = inventory[slot] ?: return
        val name = getInvObj(axe).internalName
        if (!WoodcuttingAxes.isCrystal(name)) return
        val operation = choice3("Revert to dragon axe and tool seed.", 1,
            "Uncharge and keep the crystal axe.", 2, "Cancel.", 0,
            title = "Revert or uncharge? All charges will be lost without a refund.")
        if (inventory[slot] != axe || operation == 0) return
        if (operation == 2) {
            uncharge(inventory, slot)
            return
        }
        if (inventory !== inv || inv.freeSpace() < 1) {
            mes("You need one free inventory space to revert your axe.")
            return
        }
        if (!choice2("Revert.", true, "Cancel.", false,
                title = "Revert to a dragon axe and tool seed? All charges will be lost.")) return
        if (inv[slot] != axe || inv.freeSpace() < 1) return
        if (!WoodcuttingAxes.revertCrystal(inv, slot)) return
        mes("You revert your axe, losing its charges.")
    }

    private suspend fun ProtectedAccess.createInfernal(slot: Int, stoneSlot: Int) {
        if (player.statBase("stat.woodcutting") < 61 || player.statBase("stat.firemaking") < 85) {
            mes("You need 61 Woodcutting and 85 Firemaking to create an infernal axe.")
            return
        }
        val axe = inv[slot] ?: return
        if (!choice2("Create.", true, "Cancel.", false,
                title = "Consume your dragon axe and smouldering stone to create an infernal axe?")) return
        if (inv[slot] != axe || !WoodcuttingAxes.createInfernal(inv, slot, stoneSlot)) return
        statAdvance("stat.firemaking", 350.0)
        statAdvance("stat.woodcutting", 200.0)
        checkCharges(inv[slot])
    }

    private suspend fun ProtectedAccess.rechargeInfernal(slot: Int, fuel: String, fuelSlot: Int) {
        val axe = inv[slot] ?: return
        if (WoodcuttingAxes.charges(axe) >= WoodcuttingAxes.MAX_INFERNAL) {
            mes("Your infernal axe is already fully charged.")
            return
        }
        if (!choice2("Recharge.", true, "Cancel.", false,
                title = "Consume the ${fuel.removePrefix("obj.").replace('_', ' ')} to recharge?")) return
        if (inv[slot] != axe || !WoodcuttingAxes.rechargeInfernal(inv, slot, fuelSlot)) return
        statAdvance("stat.firemaking", 350.0)
        statAdvance("stat.woodcutting", 200.0)
        checkCharges(inv[slot])
    }

    private fun ProtectedAccess.nearAnvil(): Boolean {
        val category = "category.anvil".asRSCM(RSCMType.CATEGORY)
        return (-1..1).any { dx -> (-1..1).any { dz ->
            locRepo.findAll(player.coords.translate(dx, dz)).any {
                ServerCacheManager.getObject(it.id)?.category == category
            }
        } }
    }

    private suspend fun ProtectedAccess.attachHandle(slot: Int, output: String) {
        val axe = inv[slot] ?: return
        val crystal = WoodcuttingAxes.isCrystal(getInvObj(axe).internalName)
        if (crystal && (player.smithingLvl < 76 || player.craftingLvl < 76)) {
            mes("You need 76 Smithing and 76 Crafting to create a crystal felling axe.")
            return
        }
        if (crystal && !nearSingingBowl()) {
            mes("You need to stand next to a singing bowl to attach a crystal felling axe handle.")
            return
        }
        if (!crystal && "obj.hammer" !in inv) {
            mes("You need a hammer to attach a felling axe handle.")
            return
        }
        if (!crystal && !nearAnvil()) {
            mes("You need to stand next to an anvil to attach a felling axe handle.")
            return
        }
        if (!choice2("Attach.", true, "Cancel.", false,
                title = "Attach the felling handle? This cannot be undone.")) return
        if (inv[slot] != axe) return
        if (WoodcuttingAxes.fellingConversions[getInvObj(axe).internalName] != output) return
        if (!WoodcuttingAxes.attachHandle(inv, slot, besideAnvil = nearAnvil(),
                besideSingingBowl = nearSingingBowl(), smithingLevel = player.smithingLvl,
                craftingLevel = player.craftingLvl)) return
        mes("You attach the handle to make a felling axe.")
    }

    private fun ProtectedAccess.nearSingingBowl(): Boolean {
        val bowls = setOf("loc.prif_singing_bowl".asRSCM(RSCMType.LOC),
            "loc.eyeglo_singing_bowl".asRSCM(RSCMType.LOC))
        return (-1..1).any { dx -> (-1..1).any { dz ->
            locRepo.findAll(player.coords.translate(dx, dz)).any { it.id in bowls }
        } }
    }

    private companion object {
        const val SHARD = "obj.prif_crystal_shard"
        const val HANDLE = "obj.forestry_2h_axe_handle"
        val CRYSTAL_AXES = listOf("obj.crystal_axe", "obj.crystal_axe_inactive",
            "obj.crystal_axe_2h", "obj.crystal_axe_2h_inactive")
    }
}
