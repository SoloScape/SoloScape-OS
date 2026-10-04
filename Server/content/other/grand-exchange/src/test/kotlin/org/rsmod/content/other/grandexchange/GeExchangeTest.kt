package org.rsmod.content.other.grandexchange

import java.nio.file.Files
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class GeExchangeTest {
    private val items =
        GeItemData.fromLines(
            listOf(
                "# id\tlimit\tprice\tname",
                "$WHIP\t70\t1500000\tAbyssal whip",
                "$FEATHER\t13000\t3\tFeather",
                "$LOBSTER\t6000\t150\tLobster",
                "$COAL\t13000\t150\tCoal",
                "$BOND\t100\t8000000\tOld school bond",
                "$ENERGY\t2000\t90\tEnergy potion(4)",
                "$RARE\t8\t2000000000\tThird age",
            )
        )

    private var now = 1_000_000L
    private val exchange = GeExchange(items, fillAtGuidePrice = false) { now }
    private val finished = ArrayList<Pair<GeOffer, Boolean>>()
    private val traded = ArrayList<Pair<GeOffer, GeTrade>>()

    init {
        exchange.listener =
            object : GeExchange.Listener {
                override fun onOfferTraded(offer: GeOffer, trade: GeTrade) {
                    traded += offer to trade
                }

                override fun onOfferFinished(offer: GeOffer, aborted: Boolean) {
                    finished += offer to aborted
                }
            }
    }

    @Test
    fun `buy offer trades at the cheapest sell price and refunds the difference`() {
        val sell = exchange.place(SELLER, "seller", 0, GeOfferType.Sell, FEATHER, 2, 100)
        val buy = exchange.place(BUYER, "buyer", 0, GeOfferType.Buy, FEATHER, 5, 100)

        assertTrue(buy.finished)
        assertTrue(sell.finished)
        assertEquals(100, buy.collectItems)
        assertEquals(300, buy.collectCoins, "buyer paid 5 each, trade happened at 2 each")
        assertEquals(200, buy.gold)
        assertEquals(200, sell.gold)
        assertEquals(0, sell.taxPaid, "2% of 2 coins rounds down to nothing")
        assertEquals(200, sell.collectCoins)
        assertEquals(listOf(buy to false, sell to false), finished)
    }

    @Test
    fun `sell offer trades at the highest buy price so the seller earns more`() {
        exchange.place(BUYER, "buyer", 0, GeOfferType.Buy, WHIP, 1_600_000, 1)
        exchange.place(BUYER, "buyer", 1, GeOfferType.Buy, WHIP, 1_700_000, 1)
        val sell = exchange.place(SELLER, "seller", 0, GeOfferType.Sell, WHIP, 1_500_000, 1)

        assertTrue(sell.finished)
        assertEquals(1_700_000, sell.gold)
        assertEquals(34_000, sell.taxPaid)
        assertEquals(1_666_000, sell.collectCoins)
        val cheaper = exchange.offer(BUYER, 0)!!
        assertTrue(cheaper.isActive, "the lower buy offer is still waiting")
        assertNull(exchange.offer(BUYER, 1)?.takeIf { it.isActive })
    }

    @Test
    fun `older offers win ties`() {
        val first = exchange.place(SELLER, "seller", 0, GeOfferType.Sell, LOBSTER, 150, 10)
        now += 1
        val second = exchange.place(SELLER, "seller", 1, GeOfferType.Sell, LOBSTER, 150, 10)
        exchange.place(BUYER, "buyer", 0, GeOfferType.Buy, LOBSTER, 150, 10)

        assertTrue(first.finished)
        assertFalse(second.finished)
        assertEquals(0, second.completed)
    }

    @Test
    fun `partial fills leave both offers live until quantities run out`() {
        val sell = exchange.place(SELLER, "seller", 0, GeOfferType.Sell, COAL, 100, 30)
        val buy = exchange.place(BUYER, "buyer", 0, GeOfferType.Buy, COAL, 100, 10)

        assertTrue(buy.finished)
        assertFalse(sell.finished)
        assertEquals(10, sell.completed)
        assertEquals(20, sell.remaining)
        assertEquals(1000, sell.gold)
        assertEquals(20, sell.taxPaid)
        assertEquals(980, sell.collectCoins)
    }

    @Test
    fun `tax is capped per item and waived on exempt items`() {
        assertEquals(5_000_000, items.taxPerItem(RARE, 2_000_000_000))
        assertEquals(0, items.taxPerItem(ENERGY, 90))
        assertEquals(0, items.taxPerItem(BOND, 8_000_000))
        assertEquals(0, items.taxPerItem(LOBSTER, 150), "lobsters are exempt")
        assertEquals(3, items.taxPerItem(COAL, 150))
        assertEquals(30_000, items.taxPerItem(WHIP, 1_500_000))
        assertEquals(0, items.taxPerItem(FEATHER, 49))
        assertEquals(1, items.taxPerItem(FEATHER, 50))
    }

    @Test
    fun `aborting returns what was not traded to the collect box`() {
        val buy = exchange.place(BUYER, "buyer", 0, GeOfferType.Buy, LOBSTER, 100, 10)
        val sell = exchange.place(SELLER, "seller", 0, GeOfferType.Sell, LOBSTER, 100, 4)
        assertTrue(sell.finished)
        assertTrue(exchange.abort(buy))
        assertFalse(exchange.abort(buy))

        assertTrue(buy.isCancelled)
        assertEquals(4, buy.collectItems)
        assertEquals(600, buy.collectCoins)
        assertEquals(buy to true, finished.last())

        val sell2 = exchange.place(SELLER, "seller", 1, GeOfferType.Sell, LOBSTER, 100, 5)
        assertTrue(exchange.abort(sell2))
        assertEquals(5, sell2.collectItems)
        assertEquals(0, sell2.collectCoins)
    }

    @Test
    fun `collecting everything frees the slot`() {
        val sell = exchange.place(SELLER, "seller", 3, GeOfferType.Sell, COAL, 100, 1)
        val buy = exchange.place(BUYER, "buyer", 2, GeOfferType.Buy, COAL, 120, 1)

        assertEquals(1, exchange.takeItems(buy))
        assertEquals(buy, exchange.offer(BUYER, 2), "coins are still waiting")
        assertEquals(20, exchange.takeCoins(buy))
        assertNull(exchange.offer(BUYER, 2))
        assertEquals(0, exchange.firstEmptySlot(BUYER))

        assertEquals(98, exchange.takeCoins(sell))
        assertNull(exchange.offer(SELLER, 3))
        assertEquals(0, exchange.offerCount)
    }

    @Test
    fun `buy limits cap trades and reset four hours after the first purchase`() {
        exchange.place(SELLER, "seller", 0, GeOfferType.Sell, RARE, 1000, 20)
        val buy = exchange.place(BUYER, "buyer", 0, GeOfferType.Buy, RARE, 1000, 20)

        assertEquals(8, buy.completed)
        assertFalse(buy.finished)
        assertEquals(0, exchange.remainingBuyLimit(BUYER, RARE))

        now += GeConfig.BUY_LIMIT_WINDOW_MILLIS - 1
        assertEquals(0, exchange.remainingBuyLimit(BUYER, RARE))
        now += 1
        assertEquals(8, exchange.remainingBuyLimit(BUYER, RARE))

        // A fresh sell offer matches the waiting buy offer again once the window has reset.
        exchange.place(SELLER, "seller", 1, GeOfferType.Sell, RARE, 1000, 20)
        assertEquals(16, buy.completed)
        assertEquals(GeItemData.NO_LIMIT, exchange.remainingBuyLimit(BUYER, 999_999))
    }

    @Test
    fun `history records both sides newest first`() {
        exchange.place(SELLER, "seller", 0, GeOfferType.Sell, COAL, 100, 2)
        exchange.place(BUYER, "buyer", 0, GeOfferType.Buy, COAL, 100, 1)
        now += 10
        exchange.place(BUYER, "buyer", 1, GeOfferType.Buy, COAL, 100, 1)

        val buyer = exchange.history(BUYER)
        assertEquals(2, buyer.size)
        assertEquals(GeOfferType.Buy, buyer[0].type)
        assertEquals(now, buyer[0].time)
        val seller = exchange.history(SELLER)
        assertEquals(2, seller.size)
        assertEquals(GeOfferType.Sell, seller[0].type)
        assertEquals(100, seller[0].total)
        assertEquals(2, seller[0].tax)
    }

    @Test
    fun `offers survive a save and load round trip`() {
        exchange.place(SELLER, "seller", 0, GeOfferType.Sell, LOBSTER, 100, 5)
        val buy = exchange.place(BUYER, "buyer", 4, GeOfferType.Buy, LOBSTER, 100, 2)
        val path = Files.createTempFile("ge-test", ".json")
        try {
            exchange.save(path)
            assertFalse(exchange.dirty)

            val loaded = GeExchange(items, fillAtGuidePrice = false) { now }
            assertTrue(loaded.load(path))
            val sell = loaded.offer(SELLER, 0)!!
            assertEquals(2, sell.completed)
            assertEquals(3, sell.remaining)
            assertTrue(sell.isActive)
            val reloadedBuy = loaded.offer(BUYER, 4)!!
            assertEquals(buy.id, reloadedBuy.id)
            assertTrue(reloadedBuy.finished)
            assertEquals(2, reloadedBuy.collectItems)
            assertEquals(1, loaded.history(BUYER).size)

            // The active sell offer still matches new buyers after the reload.
            loaded.place(BUYER, "buyer", 0, GeOfferType.Buy, LOBSTER, 100, 3)
            assertTrue(loaded.offer(SELLER, 0)!!.finished)
        } finally {
            Files.deleteIfExists(path)
        }
    }

    @Test
    fun `client status encodes type and completion`() {
        val sell = exchange.place(SELLER, "seller", 0, GeOfferType.Sell, LOBSTER, 100, 1)
        assertEquals(10, sell.clientStatus())
        val buy = exchange.place(BUYER, "buyer", 0, GeOfferType.Buy, LOBSTER, 100, 1)
        assertEquals(5, buy.clientStatus())
        assertEquals(13, sell.clientStatus())
    }


    @Test
    fun `solo buy completes at guide price and refunds unused escrow`() {
        val solo = GeExchange(items) { now }
        solo.listener = exchange.listener
        val buy = solo.place(BUYER, "buyer", 0, GeOfferType.Buy, COAL, 200, 10)

        assertTrue(buy.finished)
        assertEquals(5, buy.clientStatus())
        assertEquals(10, buy.completed)
        assertEquals(10, buy.collectItems)
        assertEquals(1500, buy.gold)
        assertEquals(500, buy.collectCoins)
        assertEquals(listOf(buy to false), finished)
        assertEquals(1, traded.size)
        assertEquals(GeTrade(now, GeOfferType.Buy, COAL, 10, 1500, 0), solo.history(BUYER).single())
        assertFalse(solo.abort(buy))
        assertEquals(10, solo.takeItems(buy))
        assertEquals(buy, solo.offer(BUYER, 0))
        assertEquals(500, solo.takeCoins(buy))
        assertNull(solo.offer(BUYER, 0))
    }

    @Test
    fun `solo sell completes at guide price and pays proceeds after tax`() {
        val solo = GeExchange(items) { now }
        solo.listener = exchange.listener
        val sell = solo.place(SELLER, "seller", 0, GeOfferType.Sell, WHIP, 1, 2)

        assertTrue(sell.finished)
        assertEquals(13, sell.clientStatus())
        assertEquals(2, sell.completed)
        assertEquals(3_000_000, sell.gold)
        assertEquals(60_000, sell.taxPaid)
        assertEquals(2_940_000, sell.collectCoins)
        assertEquals(0, sell.collectItems)
        assertEquals(listOf(sell to false), finished)
        assertEquals(1, traded.size)
        assertEquals(60_000, solo.history(SELLER).single().tax)
        assertEquals(2_940_000, solo.takeCoins(sell))
        assertNull(solo.offer(SELLER, 0))
    }

    @Test
    fun `solo market respects offer prices and cancellation returns all escrow once`() {
        val solo = GeExchange(items) { now }
        val buy = solo.place(BUYER, "buyer", 0, GeOfferType.Buy, COAL, 149, 10)
        val sell = solo.place(SELLER, "seller", 0, GeOfferType.Sell, COAL, 151, 10)
        solo.processOffers()

        assertEquals(0, buy.completed)
        assertEquals(0, sell.completed)
        assertTrue(solo.abort(buy))
        assertTrue(solo.abort(sell))
        assertFalse(solo.abort(buy))
        assertFalse(solo.abort(sell))
        solo.processOffers()
        assertTrue(buy.isCancelled)
        assertTrue(sell.isCancelled)
        assertEquals(1490, solo.takeCoins(buy))
        assertEquals(0, solo.takeCoins(buy))
        assertEquals(10, solo.takeItems(sell))
        assertEquals(0, solo.takeItems(sell))
        assertEquals(0, solo.offerCount)
    }

    @Test
    fun `solo buy limits resume waiting offers on a tick without a new counteroffer`() {
        val solo = GeExchange(items) { now }
        val buy = solo.place(BUYER, "buyer", 0, GeOfferType.Buy, WHIP, 1_500_000, 71)
        val later = solo.place(BUYER, "buyer", 1, GeOfferType.Buy, WHIP, 1_500_000, 1)
        assertEquals(70, buy.completed)
        assertEquals(0, later.completed)
        assertFalse(buy.finished)

        now += GeConfig.BUY_LIMIT_WINDOW_MILLIS - 1
        solo.processOffers()
        assertEquals(70, buy.completed)
        now += 1
        solo.processOffers()
        assertTrue(buy.finished)
        assertTrue(later.finished)
        assertEquals(68, solo.remainingBuyLimit(BUYER, WHIP))
        assertEquals(2, solo.history(BUYER).count { it.time == now })
    }

    @Test
    fun `cancelling a partially filled solo buy preserves items and refunds the remainder`() {
        val solo = GeExchange(items) { now }
        val buy = solo.place(BUYER, "buyer", 0, GeOfferType.Buy, WHIP, 1_600_000, 71)
        assertEquals(70, buy.completed)
        assertEquals(7_000_000, buy.collectCoins)
        assertTrue(solo.abort(buy))
        assertFalse(solo.abort(buy))
        assertEquals(8_600_000, buy.collectCoins)
        assertEquals(70, buy.collectItems)
        assertEquals(113_600_000L, buy.gold.toLong() + buy.collectCoins)

        assertEquals(20, solo.takeItems(buy, 20))
        assertEquals(buy, solo.offer(BUYER, 0))
        assertEquals(8_600_000, solo.takeCoins(buy))
        assertEquals(buy, solo.offer(BUYER, 0))
        assertEquals(50, solo.takeItems(buy))
        assertNull(solo.offer(BUYER, 0))
        now += GeConfig.BUY_LIMIT_WINDOW_MILLIS
        solo.processOffers()
        assertEquals(70, buy.completed)
    }

    @Test
    fun `solo sell caps gross proceeds and cancellation preserves the unsold items`() {
        val solo = GeExchange(items) { now }
        val sell = solo.place(SELLER, "seller", 0, GeOfferType.Sell, RARE, 1, 2)
        assertEquals(1, sell.completed)
        assertEquals(2_000_000_000, sell.gold)
        assertEquals(5_000_000, sell.taxPaid)
        assertEquals(1_995_000_000, sell.collectCoins)
        assertFalse(sell.finished)
        solo.processOffers()
        assertEquals(1, sell.completed)
        assertTrue(solo.abort(sell))
        assertEquals(1, sell.collectItems)
        assertEquals(1_995_000_000, solo.takeCoins(sell))
        assertEquals(sell, solo.offer(SELLER, 0))
        assertEquals(1, solo.takeItems(sell))
        assertNull(solo.offer(SELLER, 0))
    }

    @Test
    fun `player matches cannot overflow a sellers cumulative gross proceeds`() {
        val sell = exchange.place(SELLER, "seller", 0, GeOfferType.Sell, RARE, 1, 3)
        exchange.place(BUYER, "buyer", 0, GeOfferType.Buy, RARE, 1, 1)
        exchange.place(BUYER, "buyer", 1, GeOfferType.Buy, RARE, 2_000_000_000, 1)
        val buy = exchange.place(BUYER, "buyer", 2, GeOfferType.Buy, RARE, 2_000_000_000, 1)

        assertEquals(3, sell.gold, "incoming buyers pay the resting sell price")
        assertTrue(sell.finished)
        assertTrue(buy.finished)

        val waitingBuy = exchange.place(BUYER, "buyer", 3, GeOfferType.Buy, RARE, 2_000_000_000, 1)
        val waitingBuy2 = exchange.place(BUYER, "buyer", 4, GeOfferType.Buy, RARE, 2_000_000_000, 1)
        val largeSell = exchange.place(SELLER, "seller", 1, GeOfferType.Sell, RARE, 1, 2)
        assertEquals(1, largeSell.completed)
        assertEquals(2_000_000_000, largeSell.gold)
        assertTrue(waitingBuy.finished)
        assertFalse(waitingBuy2.finished)
        assertTrue(exchange.abort(largeSell))
        assertEquals(1, largeSell.collectItems)
    }

    @Test
    fun `cancelled partial sale keeps payouts and remaining items until both are collected`() {
        val sell = exchange.place(SELLER, "seller", 0, GeOfferType.Sell, COAL, 150, 10)
        exchange.place(BUYER, "buyer", 0, GeOfferType.Buy, COAL, 150, 4)
        assertTrue(exchange.abort(sell))
        assertFalse(exchange.abort(sell))
        assertEquals(4, sell.completed)
        assertEquals(6, sell.collectItems)
        assertEquals(588, sell.collectCoins)
        assertEquals(2, exchange.takeItems(sell, 2))
        assertEquals(588, exchange.takeCoins(sell))
        assertEquals(sell, exchange.offer(SELLER, 0))
        assertEquals(4, exchange.takeItems(sell))
        assertNull(exchange.offer(SELLER, 0))
        val next = exchange.place(SELLER, "seller", 0, GeOfferType.Sell, COAL, 150, 1)
        assertEquals(next, exchange.offer(SELLER, 0))
    }

    @Test
    fun `solo tax exempt sales pay the full guide value`() {
        val solo = GeExchange(items) { now }
        val sell = solo.place(SELLER, "seller", 0, GeOfferType.Sell, LOBSTER, 150, 2)
        assertTrue(sell.finished)
        assertEquals(300, sell.collectCoins)
        assertEquals(0, sell.taxPaid)
    }

    @Test
    fun `solo pending offers and buy limits resume after save and load`() {
        val solo = GeExchange(items) { now }
        solo.place(BUYER, "buyer", 0, GeOfferType.Buy, WHIP, 1_500_000, 71)
        val cancelled = solo.place(SELLER, "seller", 0, GeOfferType.Sell, COAL, 151, 10)
        solo.abort(cancelled)
        val path = Files.createTempFile("ge-solo-test", ".json")
        try {
            solo.save(path)
            val loaded = GeExchange(items) { now }
            assertTrue(loaded.load(path))
            loaded.processOffers()
            assertFalse(loaded.dirty)
            assertEquals(70, loaded.offer(BUYER, 0)!!.completed)
            val sell = loaded.offer(SELLER, 0)!!
            assertTrue(sell.isCancelled)
            assertEquals(10, sell.collectItems)
            now += GeConfig.BUY_LIMIT_WINDOW_MILLIS
            loaded.processOffers()
            val buy = loaded.offer(BUYER, 0)!!
            assertTrue(buy.finished)
            assertEquals(71, buy.collectItems)
            assertEquals(69, loaded.remainingBuyLimit(BUYER, WHIP))
            assertTrue(loaded.dirty)
            assertEquals(10, loaded.takeItems(sell))
            assertNull(loaded.offer(SELLER, 0))
        } finally {
            Files.deleteIfExists(path)
        }
    }

    private companion object {
        const val BUYER = 1
        const val SELLER = 2
        const val WHIP = 4151
        const val FEATHER = 314
        const val LOBSTER = 379
        const val COAL = 453
        const val BOND = 13190
        const val ENERGY = 3008
        const val RARE = 10344
    }
}
