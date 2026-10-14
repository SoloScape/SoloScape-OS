package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.types.InventoryServerType
import org.rsmod.content.skills.smithing.crystalSingingOutputVars
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory
import org.rsmod.game.type.getInvObj

fun runWoodcuttingAxeTests() {
    val metadata = Int.MIN_VALUE or (1 shl 20)
    for ((active, inactive) in listOf(
        "obj.crystal_axe" to "obj.crystal_axe_inactive",
        "obj.crystal_axe_2h" to "obj.crystal_axe_2h_inactive",
        "obj.infernal_axe" to "obj.infernal_axe_empty",
    )) {
        val first = WoodcuttingAxes.withCharges(InvObj(active, vars = metadata), 2)
        val other = WoodcuttingAxes.withCharges(InvObj(active), 49)
        val inventory = Inventory(InventoryServerType(size = 2), arrayOf(first, other))
        check(WoodcuttingAxes.consume(inventory, 0))
        check(WoodcuttingAxes.charges(inventory.getValue(0)) == 1)
        check(inventory[1] === other)
        check(WoodcuttingAxes.consume(inventory, 0))
        check(getInvObj(inventory.getValue(0)).internalName == inactive)
        check(WoodcuttingAxes.charges(inventory.getValue(0)) == 0)
        check(inventory.getValue(0).vars == metadata)
        check(!WoodcuttingAxes.consume(inventory, 0))
        check(WoodcuttingAxes.effectiveType(inventory.getValue(0)).internalName == "obj.dragon_axe")
        check(WoodcuttingAxes.charges(other) == 49)

        val zero = Inventory(InventoryServerType(size = 1), arrayOf(InvObj(active)))
        check(!WoodcuttingAxes.consume(zero, 0))
        check(getInvObj(zero.getValue(0)).internalName == inactive)
    }
    val crystal = WoodcuttingAxes.withCharges(InvObj("obj.crystal_axe", vars = metadata),
        WoodcuttingAxes.MAX_CRYSTAL)
    check(WoodcuttingAxes.charges(crystal) == 20_000)
    check(crystal.vars and metadata == metadata)
    val felling = InvObj("obj.crystal_axe_2h", vars = crystal.vars)
    check(WoodcuttingAxes.charges(felling) == 20_000)
    check(WoodcuttingAxes.effectiveType(felling).internalName == "obj.crystal_axe")
    check(WoodcuttingAxes.effectiveType(InvObj("obj.crystal_axe")).internalName == "obj.dragon_axe")
    check(runCatching { WoodcuttingAxes.withCharges(crystal, 20_001) }.isFailure)
    for ((regular, twoHanded) in WoodcuttingAxes.fellingConversions) {
        check(WoodcuttingAxes.isFelling(twoHanded))
        check(WoodcuttingAxes.animation(twoHanded) != null)
        check(WoodcuttingAxes.baseName(twoHanded) ==
            if (regular == "obj.crystal_axe_inactive") "obj.dragon_axe" else regular)
    }
    check(!WoodcuttingAxes.isFelling("obj.infernal_axe"))
    for (name in listOf("obj.crystal_axe", "obj.crystal_axe_2h")) {
        val created = InvObj(name, vars = crystalSingingOutputVars(name))
        check(WoodcuttingAxes.charges(created) == 10_000)
        val inventory = Inventory(InventoryServerType(size = 1), arrayOf(
            created.copy(vars = created.vars or metadata)))
        check(WoodcuttingAxes.unchargeCrystal(inventory, 0))
        check(WoodcuttingAxes.charges(inventory.getValue(0)) == 0)
        check(inventory.getValue(0).vars == metadata)
        check(getInvObj(inventory.getValue(0)).internalName == WoodcuttingAxes.inactiveName(name))
    }
    check(crystalSingingOutputVars("obj.crystal_harpoon") == 0)
    val axe = InvObj("obj.crystal_axe_inactive", vars = metadata)
    val charging = Inventory(InventoryServerType(size = 4), arrayOf(axe,
        InvObj("obj.prif_crystal_shard", count = 3), null, null))
    check(!WoodcuttingAxes.chargeCrystal(charging, 0, 4))
    check(charging[0] === axe && charging.getValue(1).count == 3)
    check(WoodcuttingAxes.chargeCrystal(charging, 0, 2))
    check(WoodcuttingAxes.charges(charging.getValue(0)) == 200)
    check(charging.getValue(1).count == 1)
    check(getInvObj(charging.getValue(0)).internalName == "obj.crystal_axe")
    charging[0] = WoodcuttingAxes.withCharges(charging.getValue(0), 19_999)
    check(WoodcuttingAxes.chargeCrystal(charging, 0, 1))
    check(WoodcuttingAxes.charges(charging.getValue(0)) == 20_000)
    check(charging[1] == null)
    charging[1] = InvObj("obj.hammer")
    charging[2] = InvObj("obj.forestry_2h_axe_handle")
    val beforeHandle = charging.objs.toList()
    check(!WoodcuttingAxes.attachHandle(charging, 0, false))
    check(charging.objs.toList() == beforeHandle)
    charging[1] = null
    check(!WoodcuttingAxes.attachHandle(charging, 0, true))
    check(charging.getValue(2).count == 1)
    charging[1] = InvObj("obj.hammer")
    check(!WoodcuttingAxes.attachHandle(charging, 0, true,
        besideSingingBowl = false, smithingLevel = 76, craftingLevel = 76))
    check(!WoodcuttingAxes.attachHandle(charging, 0, false,
        besideSingingBowl = true, smithingLevel = 75, craftingLevel = 76))
    check(!WoodcuttingAxes.attachHandle(charging, 0, false,
        besideSingingBowl = true, smithingLevel = 76, craftingLevel = 75))
    check(charging.getValue(2).count == 1)
    charging[1] = null
    check(WoodcuttingAxes.attachHandle(charging, 0, false,
        besideSingingBowl = true, smithingLevel = 76, craftingLevel = 76))
    check(charging[2] == null)
    check(getInvObj(charging.getValue(0)).internalName == "obj.crystal_axe_2h")
    check(WoodcuttingAxes.charges(charging.getValue(0)) == 20_000)
    check(charging.getValue(0).vars and metadata == metadata)
    charging[1] = InvObj("obj.hammer")
    charging[2] = InvObj("obj.logs")
    charging[3] = InvObj("obj.logs")
    val full = charging.objs.toList()
    check(!WoodcuttingAxes.revertCrystal(charging, 0))
    check(charging.objs.toList() == full)
    charging[3] = null
    check(WoodcuttingAxes.revertCrystal(charging, 0))
    check(getInvObj(charging.getValue(0)).internalName == "obj.dragon_axe_2h")
    check(getInvObj(charging.getValue(3)).internalName == "obj.prif_tool_seed")
    check(charging.getValue(0).vars == 0)
    for (fuel in listOf("obj.dragon_axe", "obj.smouldering_stone")) {
        val infernal = Inventory(InventoryServerType(size = 2), arrayOf(
            InvObj("obj.infernal_axe_empty", vars = metadata), null))
        check(!WoodcuttingAxes.rechargeInfernal(infernal, 0, 1))
        infernal[1] = InvObj("obj.logs")
        check(!WoodcuttingAxes.rechargeInfernal(infernal, 0, 1))
        infernal[1] = InvObj(fuel)
        check(WoodcuttingAxes.rechargeInfernal(infernal, 0, 1))
        check(infernal[1] == null)
        check(WoodcuttingAxes.charges(infernal.getValue(0)) == 5_000)
        check(infernal.getValue(0).vars and metadata == metadata)
        infernal[1] = InvObj(fuel)
        check(!WoodcuttingAxes.rechargeInfernal(infernal, 0, 1))
        check(getInvObj(infernal.getValue(1)).internalName == fuel)
    }
    val createInfernal = Inventory(InventoryServerType(size = 2), arrayOf(
        InvObj("obj.dragon_axe"), null))
    check(!WoodcuttingAxes.createInfernal(createInfernal, 0, 1))
    check(getInvObj(createInfernal.getValue(0)).internalName == "obj.dragon_axe")
    createInfernal[1] = InvObj("obj.smouldering_stone")
    check(WoodcuttingAxes.createInfernal(createInfernal, 0, 1))
    check(createInfernal[1] == null)
    check(getInvObj(createInfernal.getValue(0)).internalName == "obj.infernal_axe")
    check(WoodcuttingAxes.charges(createInfernal.getValue(0)) == 5_000)
    val ordinary = Inventory(InventoryServerType(size = 3), arrayOf(
        InvObj("obj.rune_axe"), InvObj("obj.forestry_2h_axe_handle"), null))
    check(!WoodcuttingAxes.attachHandle(ordinary, 0, true))
    ordinary[2] = InvObj("obj.hammer")
    check(!WoodcuttingAxes.attachHandle(ordinary, 0, false, besideSingingBowl = true,
        smithingLevel = 76, craftingLevel = 76))
    check(WoodcuttingAxes.attachHandle(ordinary, 0, true))
    check(getInvObj(ordinary.getValue(0)).internalName == "obj.rune_axe_2h")
    check(ordinary[1] == null)
    check(getInvObj(ordinary.getValue(2)).internalName == "obj.hammer")
    println("Woodcutting axe charge, depletion, duplicate-item, metadata and felling tests passed.")
}
