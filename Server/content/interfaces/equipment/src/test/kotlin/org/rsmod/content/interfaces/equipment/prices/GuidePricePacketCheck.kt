package org.rsmod.content.interfaces.equipment.prices

import dev.openrune.cache.CacheDelegate
import dev.openrune.types.InventoryServerType
import dev.openrune.types.ItemServerType
import io.netty.buffer.Unpooled
import java.nio.ByteBuffer
import net.rsprot.crypto.cipher.StreamCipher
import net.rsprot.protocol.game.outgoing.codec.misc.player.RunClientScriptEncoder
import net.rsprot.protocol.game.outgoing.misc.player.RunClientScript
import org.rsmod.api.invtx.InvTransactions
import org.rsmod.api.invtx.invTransfer
import org.rsmod.content.other.grandexchange.GeItemData
import org.rsmod.game.client.Client
import org.rsmod.game.client.NoopClient
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory

fun main() {
    checkPriceScriptSignature()
    checkInventoryOperations()
    val messages = mutableListOf<Any>()
    val player = Player(object : Client<Any, Any> by NoopClient {
        override fun write(message: Any) { messages.add(message) }
    })
    val encoder = RunClientScriptEncoder()
    val encode = encoder.javaClass.methods.first {
        it.name.startsWith("encode-") && it.parameterTypes.last() == RunClientScript::class.java
    }
    val cipher = object : StreamCipher { override fun nextInt(): Int = 0 }
    val guidePrices = GeItemData.load()
    val coalPrice = guidePrices.entry(453)?.guidePrice ?: error("Missing coal guide price")
    check(coalPrice > 0)
    check(guidePrices.guidePrice(453) == coalPrice)
    val cases = listOf(
        List(28) { 0 },
        List(28) { slot -> if (slot % 3 == 0) 0 else if (slot % 3 == 1) slot else Int.MAX_VALUE },
        List(28) { Int.MAX_VALUE },
        List(28) { guidePrices.guidePrice(453) },
    )
    for (prices in cases) {
        messages.clear()
        player.updateGuidePriceSlots(prices)
        check(messages.size == 1)
        val message = messages.single() as RunClientScript
        check(message.id == 785)
        check(message.types.contentEquals(CharArray(28) { 'i' }))
        check(message.values == prices)
        val buffer = Unpooled.buffer()
        try {
            encode.invoke(encoder, cipher, buffer, message)
            repeat(28) { check(buffer.readUnsignedByte().toInt() == 'i'.code) }
            check(buffer.readByte().toInt() == 0)
            for (price in prices.asReversed()) {
                check(buffer.readInt() == price)
            }
            check(buffer.readInt() == 785)
            check(!buffer.isReadable)
        } finally {
            buffer.release()
        }
    }
    for (size in listOf(0, 27, 29)) {
        messages.clear()
        check(runCatching { player.updateGuidePriceSlots(List(size) { 0 }) }
            .exceptionOrNull() is IllegalStateException)
        check(messages.isEmpty())
    }
    println("PASS: price checker encodes 28 integer arguments matching the bundled cache for empty, mixed, maximum and GE guide prices; " +
        "invalid slot counts send no packet.")
}

private fun checkPriceScriptSignature() {
    val cache = CacheDelegate("Server/.data/cache/LIVE")
    try {
        val bytes = checkNotNull(cache.data(12, 785))
        val buffer = ByteBuffer.wrap(bytes)
        val trailerLength = buffer.getShort(bytes.size - 2).toInt() and 0xffff
        val header = bytes.size - 2 - trailerLength - 16
        check(header >= 0)
        val intLocals = buffer.getShort(header + 4).toInt() and 0xffff
        val longLocals = buffer.getShort(header + 8).toInt() and 0xffff
        val intArgs = buffer.getShort(header + 10).toInt() and 0xffff
        val stringArgs = buffer.getShort(header + 12).toInt() and 0xffff
        val longArgs = buffer.getShort(header + 14).toInt() and 0xffff
        check(intArgs == 28 && stringArgs == 0 && longArgs == 0)
        check(intLocals >= intArgs && longLocals == 0)
    } finally {
        cache.close()
    }
}

private fun checkInventoryOperations() {
    val stackable = ItemServerType(id = 100, name = "Tradeable stack")
    val other = ItemServerType(id = 101, name = "Other item")
    val transactions = InvTransactions(
        emptyMap(), emptyMap(), emptyMap(), setOf(stackable.id), emptySet(),
    )
    val field = Class.forName("org.rsmod.api.invtx.InvTransactionsScriptKt")
        .getDeclaredField("cachedInventoryTransactions").apply { isAccessible = true }
    val previous = field.get(null)
    field.set(null, transactions)
    try {
        val player = Player()
        player.ui.modals.backing[1] = 464
        check(player.isAccessProtected)
        val backpack = Inventory(InventoryServerType(id = 93, size = 28, flags = 0),
            arrayOfNulls<InvObj>(28))
        val checker = Inventory(InventoryServerType(id = 90, size = 28, flags = 1),
            arrayOfNulls<InvObj>(28))
        backpack[0] = InvObj(stackable, 3)
        val blocked = player.invTransfer(backpack, 0, 1, checker)
        check(blocked.failure && backpack[0]?.count == 3 && checker.isEmpty())

        val operations = GuidePriceInventory(transactions)
        check(operations.moveSlot(backpack, checker, 0, 1).success)
        check(backpack[0]?.count == 2 && checker[0]?.count == 1)
        check(operations.moveSlot(backpack, checker, 0, 5).success)
        check(backpack[0] == null && checker[0]?.count == 3)
        check(operations.moveSlot(checker, backpack, 0, 1, compress = true).success)
        check(backpack[0]?.count == 1 && checker[0]?.count == 2)

        backpack[1] = InvObj(other)
        check(operations.moveAll(backpack, checker, keepSlots = setOf(1)).success)
        check(backpack[1]?.id == other.id && checker[0]?.count == 3)
        check(operations.moveAll(checker, backpack).success)
        check(checker.isEmpty() && backpack[0]?.count == 3 && backpack[1]?.id == other.id)

        val full = Inventory(InventoryServerType(id = 90, size = 28, flags = 1),
            Array<InvObj?>(28) { InvObj(other) })
        check(operations.moveSlot(backpack, full, 0, 1).noneCompleted())
        check(backpack[0]?.count == 3 && full.all { it?.id == other.id })
        println("PASS: modal add, partial Add-5, remove, Add-All exclusions, close returns and " +
            "full-checker item preservation.")
    } finally {
        field.set(null, previous)
    }
}
