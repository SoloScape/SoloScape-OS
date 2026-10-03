package dev.openrune.codec.osrs.impl

import dev.openrune.definition.type.ItemType
import dev.openrune.types.ItemServerType
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ItemServerCodecTest {
    @Test
    fun `full graceful retains negative weight through server cache encoding`() {
        val weights = listOf(-3000, -4000, -5000, -6000, -3000, -4000)
        val items = weights.mapIndexed { id, grams ->
            id to ItemType(id = id, weight = (grams and 0xffff).toDouble())
        }.toMap()
        val encoder = ItemServerCodec(240, items)
        val decoder = ItemServerCodec(240)
        val decodedWeights = weights.indices.map { id ->
            decoder.loadData(id, encoder.encodeToBuffer(ItemServerType(id = id))).weight
        }

        assertEquals(weights.map(Int::toDouble), decodedWeights)
        assertEquals(-25000.0, decodedWeights.sum())
    }

    @Test
    fun `ordinary item weights survive server cache encoding`() {
        for (grams in listOf(0, 600, 12000, 32767, -4535)) {
            val encoder = ItemServerCodec(240, mapOf(1 to ItemType(id = 1, weight = grams.toDouble())))
            val decoded = ItemServerCodec(240).loadData(1, encoder.encodeToBuffer(ItemServerType(id = 1)))

            assertEquals(grams.toDouble(), decoded.weight)
        }
    }

    @Test
    fun `custom server weights are not limited to signed short range`() {
        val item = ItemServerType(id = 1, weight = 40000.0)
        val codec = ItemServerCodec(240)

        assertEquals(item.weight, codec.loadData(1, codec.encodeToBuffer(item)).weight)
    }
}
