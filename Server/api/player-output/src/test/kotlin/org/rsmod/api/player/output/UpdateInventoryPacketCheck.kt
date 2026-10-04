package org.rsmod.api.player.output

import dev.openrune.types.InventoryServerType
import dev.openrune.types.ItemServerType
import io.netty.buffer.Unpooled
import net.rsprot.crypto.cipher.StreamCipher
import net.rsprot.protocol.game.outgoing.codec.inv.UpdateInvFullEncoder
import net.rsprot.protocol.game.outgoing.codec.inv.UpdateInvPartialEncoder
import net.rsprot.protocol.game.outgoing.inv.UpdateInvFull
import net.rsprot.protocol.game.outgoing.inv.UpdateInvPartial
import org.rsmod.game.client.Client
import org.rsmod.game.client.NoopClient
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory

fun main() {
    val item = ItemServerType(id = 1, name = "Test item")
    val cipher = object : StreamCipher { override fun nextInt(): Int = 0 }
    var largestPacket = 0
    for (size in listOf(0, 5000, 5001, 8000, 16865, 32768)) {
        val messages = mutableListOf<Any>()
        val player = Player(object : Client<Any, Any> by NoopClient {
            override fun write(message: Any) { messages.add(message) }
        })
        val inv = Inventory(
            InventoryServerType(id = 95),
            Array(size) { InvObj(item, Int.MAX_VALUE) },
        )
        val received = mutableMapOf<Int, Pair<Int, Int>>()
        fun receivePackets() {
            for (message in messages) {
                val full = message is UpdateInvFull
                val encoder = if (full) UpdateInvFullEncoder() else UpdateInvPartialEncoder()
                val encode = encoder.javaClass.methods.first {
                    it.name.startsWith("encode-") && it.parameterTypes.last() == message.javaClass
                }
                val buffer = Unpooled.buffer(40000, 40000)
                try {
                    encode.invoke(encoder, cipher, buffer, message)
                    largestPacket = maxOf(largestPacket, buffer.readableBytes())
                    check(buffer.readInt() == -(1234 + inv.type.id))
                    check(buffer.readUnsignedShort() == inv.type.id)
                    if (full) {
                        received.clear()
                        repeat(buffer.readUnsignedShort()) { slot ->
                            val quantityByte = (128 - buffer.readByte().toInt()) and 255
                            val quantity = if (quantityByte == 255) buffer.readInt() else quantityByte
                            received[slot] = (buffer.readUnsignedShort() - 1) to quantity
                        }
                    } else {
                        while (buffer.isReadable) {
                            val slot = if (buffer.getUnsignedByte(buffer.readerIndex()) < 128) {
                                buffer.readUnsignedByte().toInt()
                            } else {
                                buffer.readUnsignedShort() - 32768
                            }
                            val id = buffer.readUnsignedShort() - 1
                            val quantityByte = if (id == -1) 0 else buffer.readUnsignedByte().toInt()
                            val quantity = if (quantityByte == 255) buffer.readInt() else quantityByte
                            received[slot] = id to quantity
                        }
                    }
                } finally {
                    buffer.release()
                }
            }
            messages.clear()
        }
        UpdateInventory.updateInvFull(player, inv)
        receivePackets()
        check(received.size == size)
        check(received.values.all { it == item.id to Int.MAX_VALUE })
        if (size > 0) {
            inv[0] = null
            inv.modifiedSlots.set(0, size)
            UpdateInventory.updateInvPartial(player, inv)
            receivePackets()
            check(received[0] == -1 to 0)
            check((1 until size).all { received[it] == item.id to Int.MAX_VALUE })
        }
    }
    println("PASS: full and partial bank updates fit the 40,000-byte client buffer; " +
        "all slots and max stacks decode correctly; largest packet=$largestPacket bytes.")
}
