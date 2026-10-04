package org.rsmod.content.interfaces.bank

import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.vars.boolVarBit
import org.rsmod.api.player.vars.enumVarBit
import org.rsmod.api.player.vars.intVarBit
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.api.player.vars.resyncVar
import org.rsmod.content.interfaces.bank.configs.bank_constants
import org.rsmod.game.entity.Player

var ProtectedAccess.selectedTab by enumVarBit<BankTab>("varbit.bank_currenttab")

var ProtectedAccess.insertMode by boolVarBit("varbit.bank_insertmode")
var ProtectedAccess.withdrawCert by boolVarBit("varbit.bank_withdrawnotes")
var ProtectedAccess.alwaysPlacehold by boolVarBit("varbit.bank_leaveplaceholders")
var ProtectedAccess.lastQtyInput by intVarBit("varbit.bank_requestedquantity")
var ProtectedAccess.leftClickQtyMode by enumVarBit<QuantityMode>("varbit.bank_quantity_type")

var ProtectedAccess.tabDisplayMode by enumVarBit<TabDisplayMode>("varbit.bank_tab_display")
var ProtectedAccess.incinerator by boolVarBit("varbit.bank_showincinerator")
var ProtectedAccess.tutorialButton by boolVarBit("varbit.bank_hidebanktut")
var ProtectedAccess.invItemOptions by boolVarBit("varbit.bank_hidesideops")
var ProtectedAccess.depositInvButton by boolVarBit("varbit.bank_hidedepositinv")
var ProtectedAccess.depositWornButton by boolVarBit("varbit.bank_hidedepositworn")
var ProtectedAccess.bankFillerMode by enumVarBit<BankFillerMode>("varbit.bank_fillermode")

internal var Player.disableIfEvents by boolVarBit("varbit.bank_disable_ifevents")

internal fun Player.syncSelectedBankTab() {
    val tab = vars["varbit.bank_currenttab"]
    if (BankTab.entries.none { it.varValue == tab }) {
        VarPlayerIntMapSetter.set(this, "varbit.bank_currenttab", BankTab.Main.varValue)
    }
    resyncVar("varbit.bank_currenttab")
}

val ProtectedAccess.bankCapacity: Int
    get() = player.bankCapacity

private var Player.purchasedBankCapacity by intVarBit("varbit.bank_capacity")

var Player.bankCapacity: Int
    get() {
        val occupiedCapacity = invMap["inv.bank"]?.lastOccupiedSlot() ?: 0
        return if (occupiedCapacity > bank_constants.default_capacity) {
            maxOf(purchasedBankCapacity, occupiedCapacity)
        } else {
            purchasedBankCapacity
        }
    }
    set(value) {
        purchasedBankCapacity = value
    }
