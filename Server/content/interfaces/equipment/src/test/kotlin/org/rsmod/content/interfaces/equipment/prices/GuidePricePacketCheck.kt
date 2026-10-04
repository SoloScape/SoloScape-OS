package org.rsmod.content.interfaces.equipment.prices

import dev.openrune.cache.CacheDelegate
import io.netty.buffer.Unpooled
import java.nio.ByteBuffer
import net.rsprot.crypto.cipher.StreamCipher
import net.rsprot.protocol.game.outgoing.codec.misc.player.RunClientScriptEncoder
import net.rsprot.protocol.game.outgoing.misc.player.RunClientScript
import org.rsmod.content.other.grandexchange.GeItemData
import org.rsmod.game.client.Client
import org.rsmod.game.client.NoopClient
import org.rsmod.game.entity.Player

fun main() {
    checkPriceScriptSignature()
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
