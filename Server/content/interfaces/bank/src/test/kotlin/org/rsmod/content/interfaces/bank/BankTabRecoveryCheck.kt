package org.rsmod.content.interfaces.bank

import dev.openrune.ServerCacheManager
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj

/**
 * Regression: a withdrawn object in bank slot 2 must never be an orphan just
 * because an older player save is missing the Main tab count.
 */
fun main() {
    ServerCacheManager.init(240).close()
    run {
        val player = Player()
        val bank = player.invMap.getOrPut("inv.bank")
        bank[0] = InvObj("obj.logs")
        bank[1] = InvObj("obj.oak_logs")
        bank[2] = InvObj("obj.magic_logs")
        check(BankTab.entries.all { player.vars[it.sizeVarBit] == 0 })
        check(player.repairBankTabSizes() == 3)
        check(player.vars[BankTab.Main.sizeVarBit] == 3)
        check(player.repairBankTabSizes() == 0) // idempotent

        // The repair cannot depend on an item still being at the old last
        // slot after a withdrawal. The size was already restored before it.
        bank[2] = null
        check(player.repairBankTabSizes() == 0)
        check(player.vars[BankTab.Main.sizeVarBit] == 3)
        check(bank[0] == InvObj("obj.logs"))
        check(bank[1] == InvObj("obj.oak_logs"))
    }
    run {
        val player = Player()
        val bank = player.invMap.getOrPut("inv.bank")
        bank[0] = InvObj("obj.logs")
        bank[1] = InvObj("obj.oak_logs")
        bank[2] = InvObj("obj.magic_logs")
        bank[3] = InvObj("obj.yew_logs")
        VarPlayerIntMapSetter.set(player, BankTab.Tab1.sizeVarBit, 2)
        check(player.repairBankTabSizes() == 2)
        check(player.vars[BankTab.Tab1.sizeVarBit] == 2)
        check(player.vars[BankTab.Main.sizeVarBit] == 2)
        check(bank[3] == InvObj("obj.yew_logs"))
        check(player.repairBankTabSizes() == 0)
    }
    run {
        // Nothing to repair: must never manufacture bank items or tab sizes.
        val player = Player()
        check(player.repairBankTabSizes() == 0)
        check(player.vars[BankTab.Main.sizeVarBit] == 0)
        val bank = player.invMap.getOrPut("inv.bank")
        bank[0] = InvObj("obj.logs")
        VarPlayerIntMapSetter.set(player, BankTab.Main.sizeVarBit, 1)
        check(player.repairBankTabSizes() == 0)
        check(player.vars[BankTab.Main.sizeVarBit] == 1)
    }
    println("PASS: bank slot-2 tab recovery, main-tab-only repair, idempotence and existing tab preservation.")
}
