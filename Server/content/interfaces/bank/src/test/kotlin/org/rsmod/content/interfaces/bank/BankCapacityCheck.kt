package org.rsmod.content.interfaces.bank

import dev.openrune.ServerCacheManager
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.game.client.Client
import org.rsmod.game.client.NoopClient
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj

fun main() {
    ServerCacheManager.init(240)
    val messages = mutableListOf<Any>()
    val player = Player(object : Client<Any, Any> by NoopClient {
        override fun write(message: Any) { messages.add(message) }
    })
    val bank = player.invMap.getOrPut("inv.bank")
    check(bank.size == 32768)
    check(player.bankCapacity == 0)
    bank[0] = InvObj("obj.coins", 1)
    check(player.bankCapacity == 0)
    player.bankCapacity = 800
    check(player.bankCapacity == 800)
    bank[16864] = InvObj("obj.coins", Int.MAX_VALUE)
    check(player.bankCapacity == 16865)
    bank[16864] = null
    check(player.bankCapacity == 800)
    player.bankCapacity = 32768
    check(player.bankCapacity == 32768)
    VarPlayerIntMapSetter.set(player, "varbit.bank_currenttab", 15)
    player.syncSelectedBankTab()
    check(player.vars["varbit.bank_currenttab"] == BankTab.Main.varValue)
    for (tab in BankTab.entries) {
        VarPlayerIntMapSetter.set(player, "varbit.bank_currenttab", tab.varValue)
        messages.clear()
        player.syncSelectedBankTab()
        check(player.vars["varbit.bank_currenttab"] == tab.varValue)
        check(messages.size == 1)
    }
    println("PASS: bank capacity, potion-store tab recovery and forced client tab synchronization.")
}
