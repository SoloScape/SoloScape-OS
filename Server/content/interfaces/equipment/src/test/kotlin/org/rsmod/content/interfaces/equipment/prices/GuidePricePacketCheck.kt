package org.rsmod.content.interfaces.equipment.prices

import io.netty.buffer.Unpooled
import net.rsprot.crypto.cipher.StreamCipher
import net.rsprot.protocol.game.outgoing.codec.misc.player.RunClientScriptEncoder
import net.rsprot.protocol.game.outgoing.misc.player.RunClientScript
import org.rsmod.game.client.Client
import org.rsmod.game.client.NoopClient
import org.rsmod.game.entity.Player

fun main() {
    val messages = mutableListOf<Any>()
    val player = Player(object : Client<Any, Any> by NoopClient {
        override fun write(message: Any) { messages.add(message) }
    })
    val encoder = RunClientScriptEncoder()
    val encode = encoder.javaClass.methods.first {
        it.name.startsWith("encode-") && it.parameterTypes.last() == RunClientScript::class.java
    }
    val cipher = object : StreamCipher { override fun nextInt(): Int = 0 }
    val cases = listOf(
        List(28) { 0 },
        List(28) { slot -> if (slot % 3 == 0) 0 else if (slot % 3 == 1) slot else Int.MAX_VALUE },
        List(28) { Int.MAX_VALUE },
    )
    for (prices in cases) {
        messages.clear()
        player.updateGuidePriceSlots(prices)
        check(messages.size == 1)
        val message = messages.single() as RunClientScript
        check(message.id == 785)
        check(message.types.contentEquals(CharArray(28) { '\u00cf' }))
        check(message.values == prices.map { it.toLong() })
        val buffer = Unpooled.buffer()
        try {
            encode.invoke(encoder, cipher, buffer, message)
            repeat(28) { check(buffer.readUnsignedByte().toInt() == 0xcf) }
            check(buffer.readByte().toInt() == 0)
            for (price in prices.asReversed()) {
                check(buffer.readLong() == price.toLong())
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
    println("PASS: price checker encodes 28 long arguments for empty, mixed and maximum prices; " +
        "invalid slot counts send no packet.")
}
