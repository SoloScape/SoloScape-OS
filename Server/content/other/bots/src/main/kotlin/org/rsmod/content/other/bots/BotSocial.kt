package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlin.math.abs
import kotlin.random.Random
import org.rsmod.api.invtx.invAdd
import org.rsmod.api.invtx.invDel
import org.rsmod.api.invtx.invTransaction
import org.rsmod.api.invtx.select
import org.rsmod.api.invtx.transfer
import org.rsmod.api.player.ironman.isAnyIronman
import org.rsmod.api.repo.obj.ObjRepository
import org.rsmod.game.MapClock
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.obj.Obj

@Singleton
public class BotSocial @Inject constructor(
    private val actions: BotActions,
    private val objects: ObjRepository,
    private val clock: MapClock,
) {
    private data class Offer(
        val symbol: String,
        val unitPrice: Int,
        val selling: Boolean,
        var remaining: Int,
    )
    private data class Quote(
        val bot: Player,
        val offer: Offer,
        val quantity: Int,
        val expires: Int,
    )
    private data class Stock(val symbol: String, val price: Int, val bulk: Boolean = false)

    private val offers = LinkedHashMap<Player, Offer>()
    private val configured = HashSet<Player>()
    private val quotes = HashMap<Player, Quote>()
    private val lastChat = HashMap<Player, Int>()

    public fun configure(player: Player, mode: String) {
        if (!configured.add(player)) return
        when (mode) {
            "trade", "trading" -> {
                val stock = STOCK.random()
                val selling = Random.nextBoolean()
                val quantity = if (stock.bulk) BULK_QUANTITIES.random() else SMALL_QUANTITIES.random()
                val unitPrice = (stock.price * Random.nextInt(90, 111) / 100).coerceAtLeast(1)
                val result = if (selling) {
                    player.invAdd(player.inv, stock.symbol, quantity, ignoreVirtualStorage = true)
                } else {
                    player.invAdd(
                        player.inv, "obj.coins", quantity * unitPrice,
                        ignoreVirtualStorage = true,
                    )
                }
                if (result.success) offers[player] = Offer(stock.symbol, unitPrice, selling, quantity)
            }
            "drop-party", "drop_party", "dropparty", "drop-party-leader" -> {
                for (stock in STOCK.filterNot { it.bulk }.shuffled().take(4)) {
                    player.invAdd(player.inv, stock.symbol, 1, ignoreVirtualStorage = true)
                }
            }
        }
    }

    public fun remove(player: Player) {
        offers.remove(player)
        configured.remove(player)
        lastChat.remove(player)
        quotes.remove(player)
        quotes.entries.removeAll { it.value.bot === player }
    }

    public fun tick(player: Player, mode: String, cycle: Int) {
        if (player.isAccessProtected || player.isDelayed) return
        quotes.entries.removeAll { it.value.expires < cycle || !it.key.isSlotAssigned }
        when (mode) {
            "trade", "trading" -> {
                val offer = offers[player] ?: return
                if (offer.remaining > 0 && cycle - (lastChat[player] ?: -100) >= 20) {
                    val item = ServerCacheManager.getItem(offer.symbol.asRSCM(RSCMType.OBJ)) ?: return
                    val verb = if (offer.selling) "Selling" else "Buying"
                    player.say("$verb ${offer.remaining} ${item.name} ${offer.unitPrice}gp ea - ${player.username}")
                    lastChat[player] = cycle
                }
            }
            "drop-party", "drop_party", "dropparty", "drop-party-leader" -> {
                if (cycle % 8 != 0 || !Random.nextBoolean()) return
                val slot = player.inv.indices.firstOrNull { player.inv[it] != null } ?: return
                val held = player.inv[slot] ?: return
                val type = ServerCacheManager.getItem(held.id) ?: return
                if (type.isDummyItem) return
                val count = if (type.isStackable) held.count else 1
                val transaction = player.invDel(
                    player.inv, held.id, count, slot = slot, autoCommit = false,
                )
                if (!transaction.success) return
                val obj = Obj.fromServer(clock, player.coords, held.copy(count = count))
                if (objects.add(obj, duration = 300)) {
                    transaction.commitAll()
                    player.say("Dropping now!")
                }
            }
            "drop-party-follower", "drop_party_follower" -> actions.pickup(player, radius = 8)
        }
    }

    public fun trade(
        requester: Player,
        botName: String,
        quantity: Int,
        confirm: Boolean,
    ): String {
        val bot = offers.keys.firstOrNull {
            it.username.equals(botName, true) || it.displayName.equals(botName, true)
        } ?: return "No trading bot named $botName."
        val offer = offers.getValue(bot)
        if (requester === bot || requester in configured) return "Bots cannot request trades."
        if (requester.isAnyIronman) return "Ironmen cannot trade with bots."
        if (!requester.isSlotAssigned || !bot.isSlotAssigned ||
            requester.coords.level != bot.coords.level ||
            maxOf(abs(requester.coords.x - bot.coords.x), abs(requester.coords.z - bot.coords.z)) > 2
        ) return "Stand next to the trading bot."
        if (requester.isAccessProtected || bot.isAccessProtected ||
            requester.isDelayed || bot.isDelayed || requester.ui.modals.isNotEmpty()
        ) return "Finish your current action before trading."
        if (quantity !in 1..offer.remaining) return "Available quantity: ${offer.remaining}."
        val total = quantity.toLong() * offer.unitPrice
        if (total !in 1..Int.MAX_VALUE.toLong()) return "The trade value is too large."
        if (!confirm) {
            quotes[requester] = Quote(bot, offer, quantity, clock.cycle + 50)
            val verb = if (offer.selling) "Buy" else "Sell"
            return "$verb $quantity ${offer.symbol.removePrefix("obj.")} for $total coins. " +
                "Confirm with ::bottrade ${bot.username} $quantity confirm within 30 seconds."
        }
        val quote = quotes.remove(requester)
            ?: return "Request a quote with ::bottrade ${bot.username} $quantity first."
        if (quote.bot !== bot || quote.offer !== offer || quote.quantity != quantity ||
            quote.expires < clock.cycle
        ) return "The quote expired or changed. Request another quote."
        val seller = if (offer.selling) bot else requester
        val buyer = if (offer.selling) requester else bot
        val itemId = offer.symbol.asRSCM(RSCMType.OBJ)
        val coinsId = "obj.coins".asRSCM(RSCMType.OBJ)
        val itemSlots = seller.inv.indices.filter { seller.inv[it]?.id == itemId }
        val coinSlots = buyer.inv.indices.filter { buyer.inv[it]?.id == coinsId }
        if (itemSlots.sumOf { seller.inv.getValue(it).count.toLong() } < quantity ||
            coinSlots.sumOf { buyer.inv.getValue(it).count.toLong() } < total
        ) return "The seller lacks items or the buyer lacks coins."
        val transaction = requester.invTransaction(
            requester.inv, bot.inv, autoCommit = false,
        ) {
            val sellerInv = select(seller.inv)
            val buyerInv = select(buyer.inv)
            var itemsLeft = quantity
            for (slot in itemSlots) {
                if (itemsLeft == 0) break
                val amount = minOf(itemsLeft, seller.inv.getValue(slot).count)
                transfer(sellerInv, slot, amount, buyerInv)
                itemsLeft -= amount
            }
            var coinsLeft = total.toInt()
            for (slot in coinSlots) {
                if (coinsLeft == 0) break
                val amount = minOf(coinsLeft, buyer.inv.getValue(slot).count)
                transfer(buyerInv, slot, amount, sellerInv)
                coinsLeft -= amount
            }
        }
        if (!transaction.success) return "Both players need inventory space to complete the trade."
        transaction.commitAll()
        offer.remaining -= quantity
        return "Traded $quantity ${offer.symbol.removePrefix("obj.")} for $total coins."
    }

    private companion object {
        val BULK_QUANTITIES = listOf(100, 200, 500, 1000)
        val SMALL_QUANTITIES = listOf(1, 2, 5, 10)
        val STOCK = listOf(
            Stock("obj.feather", 5, true),
            Stock("obj.air_rune", 5, true),
            Stock("obj.nature_rune", 200, true),
            Stock("obj.coal", 180),
            Stock("obj.logs", 25),
            Stock("obj.yew_logs", 300),
            Stock("obj.lobster", 150),
            Stock("obj.shark", 800),
        )
    }
}
