package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.types.ItemServerType
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
import org.rsmod.content.other.grandexchange.GeItemData
import org.rsmod.game.MapClock
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.obj.Obj

@Singleton
public class BotSocial @Inject constructor(
    private val actions: BotActions,
    private val objects: ObjRepository,
    private val clock: MapClock,
    private val prices: GeItemData,
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
    private data class Stock(
        val name: String,
        val quantities: List<Int>,
        val common: Boolean,
        val combat: Boolean,
    )
    private data class Reply(val speaker: Player, val text: String, val due: Int)
    private val modes = HashMap<Player, String>()
    private val activitySkills = HashMap<Player, String>()
    private val replies = HashMap<Player, Reply>()
    private val resolvedStock by lazy {
        val cache = ServerCacheManager.getItemTypes().filter {
            !it.isCert && !it.isPlaceholder && !it.isTransformation && !it.isDummyItem &&
                it.tradeable
        }.groupBy { it.lowercaseName }
        STOCK.mapNotNull { stock ->
            val item = cache[stock.name.lowercase()]?.minByOrNull { it.id }
            item?.let { stock to it }
        }
    }

    private val offers = LinkedHashMap<Player, Offer>()
    private val configured = HashSet<Player>()
    private val quotes = HashMap<Player, Quote>()
    private val lastChat = HashMap<Player, Int>()

    public fun configure(player: Player, mode: String) {
        modes[player] = mode
        if (!configured.add(player)) return
        when (mode) {
            "trade", "trading", "combat-trade" -> {
                val pool = if (mode.contains("combat")) {
                    resolvedStock.filter { it.first.combat }
                } else if (Random.nextInt(100) < 90) {
                    resolvedStock.filter { it.first.common }
                } else resolvedStock
                val (stock, item) = pool.ifEmpty { resolvedStock }.randomOrNull() ?: return
                val selling = Random.nextBoolean()
                val requested = stock.quantities.random()
                val guide = prices.guidePrice(item.id)
                val changed = guide.toLong() * Random.nextInt(90, 111) / 100
                val quantity = requested.coerceAtMost(
                    (Int.MAX_VALUE.toLong() / changed.coerceAtLeast(1)).toInt().coerceAtLeast(1),
                )
                val unitPrice = roundPrice(changed, quantity, selling)
                val traded = if (!item.isStackable && quantity >= 10 && item.canCert) {
                    ServerCacheManager.getItem(item.certlink) ?: item
                } else item
                val count = if (!traded.isStackable) quantity.coerceAtMost(10) else quantity
                val symbol = traded.internalName
                val result = if (selling) {
                    player.invAdd(player.inv, symbol, count, ignoreVirtualStorage = true)
                } else {
                    player.invAdd(
                        player.inv, "obj.coins", count * unitPrice,
                        ignoreVirtualStorage = true,
                    )
                }
                if (result.success) offers[player] = Offer(symbol, unitPrice, selling, count)
            }
            "drop-party", "drop_party", "dropparty", "drop-party-leader" -> {
                for ((_, item) in resolvedStock.filter { it.first.common }.shuffled().take(4)) {
                    player.invAdd(player.inv, item.internalName, 1, ignoreVirtualStorage = true)
                }
            }
        }
    }

    public fun remove(player: Player) {
        offers.remove(player)
        configured.remove(player)
        lastChat.remove(player)
        modes.remove(player)
        activitySkills.remove(player)
        replies.remove(player)
        replies.entries.removeAll { it.value.speaker === player }
        quotes.remove(player)
        quotes.entries.removeAll { it.value.bot === player }
    }

    public fun tick(player: Player, mode: String, cycle: Int) {
        if (player.isAccessProtected || player.isDelayed) return
        val reply = replies[player]
        if (reply != null && cycle >= reply.due) {
            replies.remove(player)
            if (reply.speaker.isSlotAssigned && nearby(player, reply.speaker, 15)) {
                player.say(reply.text)
                lastChat[player] = cycle
            }
        }
        quotes.entries.removeAll { it.value.expires < cycle || !it.key.isSlotAssigned }
        when (mode) {
            "trade", "trading", "combat-trade" -> {
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

    public fun configureActivity(player: Player, skill: String) {
        activitySkills[player] = skill
    }

    public fun hear(speaker: Player, message: String, bots: List<Player>, cycle: Int) {
        if (speaker in bots) return
        val text = message.trim().lowercase()
        val levels = text in LEVEL_REQUESTS
        val trading = text.startsWith("buy") || text.startsWith("sell")
        if (!levels && !trading) return
        for (bot in bots) {
            if (bot === speaker || !nearby(speaker, bot, 15) || bot in replies ||
                cycle - (lastChat[bot] ?: -100) < 10
            ) continue
            var response: String? = null
            if (levels && Random.nextInt(10) != 0) {
                val skill = activitySkills[bot] ?: MODE_SKILLS[modes[bot]]
                response = if (skill != null) {
                    val level = bot.statMap.getBaseLevel(skill).toInt()
                    if (Random.nextInt(10) == 0) "$level u?" else "$level"
                } else {
                    val attack = bot.statMap.getBaseLevel("stat.attack").toInt()
                    val defence = bot.statMap.getBaseLevel("stat.defence").toInt()
                    val strength = bot.statMap.getBaseLevel("stat.strength").toInt()
                    "atk: $attack def: $defence str: $strength"
                }
            } else if (trading && Random.nextInt(3) == 0) {
                val offer = offers[bot] ?: continue
                if (offer.remaining <= 0) continue
                val item = ServerCacheManager.getItem(offer.symbol.asRSCM(RSCMType.OBJ)) ?: continue
                val name = item.lowercaseName
                val aliases = ALIASES[name].orEmpty() + name
                if (aliases.none { text.contains(it) }) continue
                if (text.startsWith("buy") != offer.selling) continue
                response = "${if (offer.selling) "Selling" else "Buying"} " +
                    "${offer.remaining} ${item.name} ${offer.unitPrice}gp ea. " +
                    "::bottrade ${bot.username} <quantity>"
            }
            if (response != null) replies[bot] = Reply(speaker, response, cycle + Random.nextInt(3, 6))
        }
    }

    private fun nearby(first: Player, second: Player, radius: Int): Boolean =
        first.coords.level == second.coords.level &&
            maxOf(abs(first.coords.x - second.coords.x), abs(first.coords.z - second.coords.z)) <= radius

    private fun roundPrice(price: Long, quantity: Int, selling: Boolean): Int {
        val total = (price * quantity).coerceAtMost(Int.MAX_VALUE.toLong())
        val step = when {
            total < 1_000 -> 10L
            total < 10_000 -> 100L
            total < 100_000 -> 1_000L
            total < 1_000_000 -> 10_000L
            total < 10_000_000 -> 100_000L
            else -> 1_000_000L
        }
        val rounded = if (selling) ((total + step - 1) / step) * step else total / step * step
        return (rounded / quantity).coerceIn(
            1, (Int.MAX_VALUE / quantity).toLong(),
        ).toInt()
    }

    private companion object {
        val LEVEL_REQUESTS = setOf(
            "lvls?", "lvls", "lvl?", "lvl", "levels?", "levels", "level?", "level",
        )
        val MODE_SKILLS = mapOf(
            "fishing" to "stat.fishing",
            "cooking" to "stat.cooking",
            "mining" to "stat.mining",
            "smelting" to "stat.smithing",
            "smithing" to "stat.smithing",
            "woodcutting" to "stat.woodcutting",
            "runecrafting" to "stat.runecraft",
            "shearing" to "stat.crafting",
            "spinning" to "stat.crafting",
            "tanning" to "stat.crafting",
            "crafting" to "stat.crafting",
        )
        val ALIASES = mapOf(
            "guam leaf" to listOf("guam"),
            "raw lobster" to listOf("raw lob"),
            "lobster" to listOf("lob"),
            "dragon bones" to listOf("d bone"),
            "air rune" to listOf("air"),
            "mind rune" to listOf("mind"),
            "death rune" to listOf("death"),
            "nature rune" to listOf("nat"),
            "law rune" to listOf("law"),
            "cosmic rune" to listOf("cosmic"),
            "blood rune" to listOf("blood"),
            "dragon longsword" to listOf("dlong"),
            "rune 2h sword" to listOf("r2h"),
            "rune scimitar" to listOf("rune scim"),
            "rune battleaxe" to listOf("rune baxe"),
            "dragon battleaxe" to listOf("dbaxe"),
            "rune essence" to listOf("rune ess"),
            "amulet of strength" to listOf("str ammy"),
            "amulet of magic" to listOf("mage ammy"),
            "amulet of defence" to listOf("def ammy"),
            "amulet of power" to listOf("power ammy"),
            "abyssal whip" to listOf("whip"),
            "granite maul" to listOf("gmaul"),
            "toktz-xil-ul" to listOf("obby ring"),
            "toktz-xil-ak" to listOf("obby sword"),
            "toktz-ket-xil" to listOf("obby shield"),
            "toktz-xil-ek" to listOf("obby knife"),
            "toktz-mej-tal" to listOf("obby staff"),
            "tzhaar-ket-em" to listOf("obby mace"),
            "tzhaar-ket-om" to listOf("obby maul"),
            "obsidian cape" to listOf("obby cape"),
            "pure essence" to listOf("pure ess"),
        )
        val STOCK = listOf(
            Stock("Arrow shaft", listOf(100, 200, 500, 1000), false, false),
            Stock("Strength potion(3)", listOf(10, 20, 50, 100), false, true),
            Stock("Attack potion(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Restore potion(3)", listOf(10, 20, 50, 100), true, true),
            Stock("Defence potion(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Prayer potion(3)", listOf(10, 20, 50, 100), true, true),
            Stock("Super attack(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Fishing potion(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Super strength(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Super defence(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Ranging potion(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Antipoison(3)", listOf(10, 20, 50, 100), true, true),
            Stock("Superantipoison(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Weapon poison", listOf(1, 2, 5, 10), false, false),
            Stock("Zamorak brew(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Eye of newt", listOf(10, 20, 50, 100), false, false),
            Stock("Red spiders' eggs", listOf(10, 20, 50, 100), true, false),
            Stock("Limpwurt root", listOf(10, 20, 50, 100), true, false),
            Stock("Snape grass", listOf(10, 20, 50, 100), true, false),
            Stock("Unicorn horn", listOf(10, 20, 50, 100), true, false),
            Stock("White berries", listOf(10, 20, 50, 100), false, false),
            Stock("Blue dragon scale", listOf(10, 20, 50, 100), false, false),
            Stock("Wine of Zamorak", listOf(10, 20, 50, 100), false, false),
            Stock("Jangerberries", listOf(10, 20, 50, 100), false, false),
            Stock("Guam leaf", listOf(10, 20, 50, 100), true, false),
            Stock("Marrentill", listOf(10, 20, 50, 100), true, false),
            Stock("Tarromin", listOf(10, 20, 50, 100), true, false),
            Stock("Harralander", listOf(10, 20, 50, 100), true, false),
            Stock("Ranarr weed", listOf(10, 20, 50, 100), true, false),
            Stock("Irit leaf", listOf(10, 20, 50, 100), false, false),
            Stock("Avantoe", listOf(10, 20, 50, 100), false, false),
            Stock("Kwuarm", listOf(10, 20, 50, 100), false, false),
            Stock("Cadantine", listOf(10, 20, 50, 100), false, false),
            Stock("Dwarf weed", listOf(10, 20, 50, 100), false, false),
            Stock("Torstol", listOf(10, 20, 50, 100), false, false),
            Stock("Feather", listOf(100, 200, 500, 1000), true, false),
            Stock("Shrimps", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw shrimps", listOf(100, 200, 500, 1000), false, false),
            Stock("Anchovies", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw anchovies", listOf(100, 200, 500, 1000), false, false),
            Stock("Sardine", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw sardine", listOf(100, 200, 500, 1000), false, false),
            Stock("Salmon", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw salmon", listOf(100, 200, 500, 1000), false, false),
            Stock("Trout", listOf(100, 200, 500, 1000), true, true),
            Stock("Raw trout", listOf(100, 200, 500, 1000), true, false),
            Stock("Cod", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw cod", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw herring", listOf(100, 200, 500, 1000), false, false),
            Stock("Herring", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw pike", listOf(100, 200, 500, 1000), false, false),
            Stock("Pike", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw mackerel", listOf(100, 200, 500, 1000), false, false),
            Stock("Mackerel", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw tuna", listOf(100, 200, 500, 1000), false, false),
            Stock("Tuna", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw bass", listOf(100, 200, 500, 1000), false, false),
            Stock("Bass", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw swordfish", listOf(100, 200, 500, 1000), false, false),
            Stock("Swordfish", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw lobster", listOf(100, 200, 500, 1000), true, false),
            Stock("Lobster", listOf(100, 200, 500, 1000), true, true),
            Stock("Raw shark", listOf(100, 200, 500, 1000), true, false),
            Stock("Shark", listOf(100, 200, 500, 1000), true, true),
            Stock("Raw manta ray", listOf(100, 200, 500, 1000), false, false),
            Stock("Manta ray", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw sea turtle", listOf(100, 200, 500, 1000), false, false),
            Stock("Sea turtle", listOf(100, 200, 500, 1000), false, false),
            Stock("Casket", listOf(1), false, false),
            Stock("Oyster", listOf(1), false, false),
            Stock("Clay", listOf(100, 200, 500, 1000), false, false),
            Stock("Copper ore", listOf(100, 200, 500, 1000), false, false),
            Stock("Tin ore", listOf(100, 200, 500, 1000), false, false),
            Stock("Iron ore", listOf(100, 200, 500, 1000), false, false),
            Stock("Silver ore", listOf(100, 200, 500, 1000), false, false),
            Stock("Gold ore", listOf(100, 200, 500, 1000), false, false),
            Stock("Mithril ore", listOf(100, 200, 500, 1000), false, false),
            Stock("Adamantite ore", listOf(100, 200, 500, 1000), false, false),
            Stock("Runite ore", listOf(100, 200, 500, 1000), false, false),
            Stock("Coal", listOf(100, 200, 500, 1000), true, false),
            Stock("Strange fruit", listOf(1), false, false),
            Stock("Bones", listOf(100, 200, 500, 1000), false, false),
            Stock("Burnt bones", listOf(100, 200, 500, 1000), false, false),
            Stock("Bat bones", listOf(100, 200, 500, 1000), false, false),
            Stock("Big bones", listOf(100, 200, 500, 1000), true, false),
            Stock("Babydragon bones", listOf(100, 200, 500, 1000), false, false),
            Stock("Dragon bones", listOf(100, 200, 500, 1000), true, false),
            Stock("Fire rune", listOf(500, 1000, 2000, 5000, 10000), false, false),
            Stock("Water rune", listOf(500, 1000, 2000, 5000, 10000), false, false),
            Stock("Air rune", listOf(500, 1000, 2000, 5000, 10000), true, false),
            Stock("Earth rune", listOf(500, 1000, 2000, 5000, 10000), false, false),
            Stock("Mind rune", listOf(500, 1000, 2000, 5000, 10000), false, false),
            Stock("Body rune", listOf(500, 1000, 2000, 5000, 10000), false, false),
            Stock("Death rune", listOf(100, 200, 500, 1000), false, true),
            Stock("Nature rune", listOf(100, 200, 500, 1000), true, false),
            Stock("Chaos rune", listOf(100, 200, 500, 1000), false, true),
            Stock("Law rune", listOf(100, 200, 500, 1000), true, false),
            Stock("Cosmic rune", listOf(100, 200, 500, 1000), true, false),
            Stock("Blood rune", listOf(100, 200, 500, 1000), false, true),
            Stock("Soul rune", listOf(100, 200, 500, 1000), false, false),
            Stock("Bronze thrownaxe", listOf(100, 200, 500, 1000), false, false),
            Stock("Iron thrownaxe", listOf(100, 200, 500, 1000), false, false),
            Stock("Steel thrownaxe", listOf(100, 200, 500, 1000), false, false),
            Stock("Mithril thrownaxe", listOf(100, 200, 500, 1000), false, false),
            Stock("Adamant thrownaxe", listOf(100, 200, 500, 1000), false, false),
            Stock("Rune thrownaxe", listOf(100, 200, 500, 1000), false, false),
            Stock("Bronze dart", listOf(100, 200, 500, 1000), false, false),
            Stock("Iron dart", listOf(100, 200, 500, 1000), false, false),
            Stock("Steel dart", listOf(100, 200, 500, 1000), false, false),
            Stock("Mithril dart", listOf(100, 200, 500, 1000), false, false),
            Stock("Adamant dart", listOf(100, 200, 500, 1000), false, false),
            Stock("Rune dart", listOf(100, 200, 500, 1000), false, true),
            Stock("Maple longbow", listOf(1), false, false),
            Stock("Maple shortbow", listOf(1), false, false),
            Stock("Yew longbow", listOf(1), false, false),
            Stock("Yew shortbow", listOf(1), false, false),
            Stock("Magic longbow", listOf(1), false, false),
            Stock("Magic shortbow", listOf(1), false, true),
            Stock("Iron knife", listOf(100, 200, 500, 1000), false, false),
            Stock("Bronze knife", listOf(100, 200, 500, 1000), false, false),
            Stock("Steel knife", listOf(100, 200, 500, 1000), false, false),
            Stock("Mithril knife", listOf(100, 200, 500, 1000), false, false),
            Stock("Adamant knife", listOf(100, 200, 500, 1000), false, false),
            Stock("Rune knife", listOf(100, 200, 500, 1000), false, true),
            Stock("Black knife", listOf(100, 200, 500, 1000), false, false),
            Stock("Bronze bolts", listOf(100, 200, 500, 1000), false, false),
            Stock("Opal bolts", listOf(100, 200, 500, 1000), false, false),
            Stock("Pearl bolts", listOf(100, 200, 500, 1000), false, false),
            Stock("Barbed bolts", listOf(100, 200, 500, 1000), false, false),
            Stock("Bronze arrow", listOf(500, 1000, 2000, 5000, 10000), false, false),
            Stock("Iron arrow", listOf(500, 1000, 2000, 5000, 10000), false, false),
            Stock("Steel arrow", listOf(500, 1000, 2000, 5000, 10000), false, true),
            Stock("Mithril arrow", listOf(100, 200, 500, 1000), false, true),
            Stock("Adamant arrow", listOf(100, 200, 500, 1000), false, true),
            Stock("Rune arrow", listOf(100, 200, 500, 1000), false, true),
            Stock("Spade", listOf(1), false, false),
            Stock("Christmas cracker", listOf(1), false, false),
            Stock("Tooth half of key", listOf(1), false, false),
            Stock("Loop half of key", listOf(1), false, false),
            Stock("Crystal key", listOf(1), false, false),
            Stock("Muddy key", listOf(1), false, false),
            Stock("Zamorak monk bottom", listOf(1), false, false),
            Stock("Zamorak monk top", listOf(1), false, false),
            Stock("Red partyhat", listOf(1), false, false),
            Stock("Yellow partyhat", listOf(1), false, false),
            Stock("Blue partyhat", listOf(1), false, false),
            Stock("Green partyhat", listOf(1), false, false),
            Stock("Purple partyhat", listOf(1), false, false),
            Stock("White partyhat", listOf(1), false, false),
            Stock("Santa hat", listOf(1), false, false),
            Stock("Green halloween mask", listOf(1), false, false),
            Stock("Blue halloween mask", listOf(1), false, false),
            Stock("Red halloween mask", listOf(1), false, false),
            Stock("Leather gloves", listOf(1), false, false),
            Stock("Leather boots", listOf(1), false, false),
            Stock("Leather vambraces", listOf(1), false, false),
            Stock("Green d'hide vambraces", listOf(1), false, false),
            Stock("Steel platelegs", listOf(1), false, false),
            Stock("Mithril platelegs", listOf(1), false, false),
            Stock("Adamant platelegs", listOf(1), false, false),
            Stock("Black platelegs", listOf(1), false, false),
            Stock("Rune platelegs", listOf(1), false, false),
            Stock("Steel plateskirt", listOf(1), false, false),
            Stock("Mithril plateskirt", listOf(1), false, false),
            Stock("Black plateskirt", listOf(1), false, false),
            Stock("Adamant plateskirt", listOf(1), false, false),
            Stock("Rune plateskirt", listOf(1), false, false),
            Stock("Leather chaps", listOf(1), false, false),
            Stock("Studded chaps", listOf(1), false, false),
            Stock("Green d'hide chaps", listOf(1), false, false),
            Stock("Steel chainbody", listOf(1), false, false),
            Stock("Black chainbody", listOf(1), false, false),
            Stock("Mithril chainbody", listOf(1), false, false),
            Stock("Adamant chainbody", listOf(1), false, false),
            Stock("Rune chainbody", listOf(1), false, false),
            Stock("Steel platebody", listOf(1), false, false),
            Stock("Mithril platebody", listOf(1), false, false),
            Stock("Adamant platebody", listOf(1), false, false),
            Stock("Black platebody", listOf(1), false, false),
            Stock("Rune platebody", listOf(1), false, false),
            Stock("Leather body", listOf(1), false, false),
            Stock("Hardleather body", listOf(1), false, false),
            Stock("Studded body", listOf(1), false, false),
            Stock("Green d'hide body", listOf(1), false, false),
            Stock("Steel med helm", listOf(1), false, false),
            Stock("Mithril med helm", listOf(1), false, false),
            Stock("Adamant med helm", listOf(1), false, false),
            Stock("Rune med helm", listOf(1), false, false),
            Stock("Dragon med helm", listOf(1), false, false),
            Stock("Black med helm", listOf(1), false, false),
            Stock("Steel full helm", listOf(1), false, false),
            Stock("Mithril full helm", listOf(1), false, false),
            Stock("Adamant full helm", listOf(1), false, false),
            Stock("Rune full helm", listOf(1), false, true),
            Stock("Black full helm", listOf(1), false, false),
            Stock("Leather cowl", listOf(1), false, false),
            Stock("Coif", listOf(1), false, false),
            Stock("Steel sq shield", listOf(1), false, false),
            Stock("Black sq shield", listOf(1), false, false),
            Stock("Mithril sq shield", listOf(1), false, false),
            Stock("Adamant sq shield", listOf(1), false, false),
            Stock("Rune sq shield", listOf(1), false, false),
            Stock("Dragon sq shield", listOf(1), false, false),
            Stock("Steel kiteshield", listOf(1), false, false),
            Stock("Black kiteshield", listOf(1), false, false),
            Stock("Mithril kiteshield", listOf(1), false, false),
            Stock("Adamant kiteshield", listOf(1), false, false),
            Stock("Rune kiteshield", listOf(1), false, true),
            Stock("Steel dagger", listOf(1), false, false),
            Stock("Mithril dagger", listOf(1), false, false),
            Stock("Adamant dagger", listOf(1), false, false),
            Stock("Rune dagger", listOf(1), false, false),
            Stock("Dragon dagger", listOf(1), false, true),
            Stock("Black dagger", listOf(1), false, false),
            Stock("Dragon dagger(p)", listOf(1), false, true),
            Stock("Bronze pickaxe", listOf(1), false, false),
            Stock("Iron pickaxe", listOf(1), false, false),
            Stock("Steel pickaxe", listOf(1), false, false),
            Stock("Adamant pickaxe", listOf(1), false, false),
            Stock("Mithril pickaxe", listOf(1), false, false),
            Stock("Rune pickaxe", listOf(1), false, false),
            Stock("Steel sword", listOf(1), false, false),
            Stock("Black sword", listOf(1), false, false),
            Stock("Mithril sword", listOf(1), false, false),
            Stock("Adamant sword", listOf(1), false, false),
            Stock("Rune sword", listOf(1), false, false),
            Stock("Steel longsword", listOf(1), false, false),
            Stock("Black longsword", listOf(1), false, false),
            Stock("Mithril longsword", listOf(1), false, false),
            Stock("Adamant longsword", listOf(1), false, false),
            Stock("Rune longsword", listOf(1), false, true),
            Stock("Dragon longsword", listOf(1), false, false),
            Stock("Steel 2h sword", listOf(1), false, false),
            Stock("Black 2h sword", listOf(1), false, false),
            Stock("Mithril 2h sword", listOf(1), false, false),
            Stock("Adamant 2h sword", listOf(1), false, false),
            Stock("Rune 2h sword", listOf(1), false, true),
            Stock("Steel scimitar", listOf(1), false, false),
            Stock("Black scimitar", listOf(1), false, false),
            Stock("Mithril scimitar", listOf(1), false, false),
            Stock("Adamant scimitar", listOf(1), false, false),
            Stock("Rune scimitar", listOf(1), false, true),
            Stock("Steel warhammer", listOf(1), false, false),
            Stock("Black warhammer", listOf(1), false, false),
            Stock("Mithril warhammer", listOf(1), false, false),
            Stock("Adamant warhammer", listOf(1), false, false),
            Stock("Rune warhammer", listOf(1), false, false),
            Stock("Iron axe", listOf(1), false, false),
            Stock("Bronze axe", listOf(1), false, false),
            Stock("Steel axe", listOf(1), false, false),
            Stock("Mithril axe", listOf(1), true, false),
            Stock("Adamant axe", listOf(1), true, false),
            Stock("Rune axe", listOf(1), true, false),
            Stock("Black axe", listOf(1), false, false),
            Stock("Steel battleaxe", listOf(1), false, false),
            Stock("Black battleaxe", listOf(1), false, false),
            Stock("Mithril battleaxe", listOf(1), false, false),
            Stock("Adamant battleaxe", listOf(1), false, false),
            Stock("Rune battleaxe", listOf(1), false, true),
            Stock("Dragon battleaxe", listOf(1), false, false),
            Stock("Staff", listOf(1), false, false),
            Stock("Staff of air", listOf(1), false, false),
            Stock("Staff of water", listOf(1), false, false),
            Stock("Staff of earth", listOf(1), false, false),
            Stock("Staff of fire", listOf(1), false, false),
            Stock("Battlestaff", listOf(10, 20, 50, 100), true, false),
            Stock("Fire battlestaff", listOf(1), false, false),
            Stock("Water battlestaff", listOf(1), false, false),
            Stock("Air battlestaff", listOf(1), false, false),
            Stock("Earth battlestaff", listOf(1), false, false),
            Stock("Mystic fire staff", listOf(1), false, false),
            Stock("Mystic water staff", listOf(1), false, false),
            Stock("Mystic air staff", listOf(1), false, false),
            Stock("Mystic earth staff", listOf(1), false, false),
            Stock("Steel mace", listOf(1), false, false),
            Stock("Black mace", listOf(1), false, false),
            Stock("Mithril mace", listOf(1), false, false),
            Stock("Adamant mace", listOf(1), false, false),
            Stock("Rune mace", listOf(1), false, false),
            Stock("Dragon mace", listOf(1), false, false),
            Stock("Rune essence", listOf(100, 200, 500, 1000, 2000), true, false),
            Stock("Air talisman", listOf(1), true, false),
            Stock("Earth talisman", listOf(1), true, false),
            Stock("Fire talisman", listOf(1), true, false),
            Stock("Water talisman", listOf(1), true, false),
            Stock("Body talisman", listOf(1), true, false),
            Stock("Mind talisman", listOf(1), true, false),
            Stock("Chaos talisman", listOf(1), true, false),
            Stock("Cosmic talisman", listOf(1), true, false),
            Stock("Death talisman", listOf(1), false, false),
            Stock("Nature talisman", listOf(1), true, false),
            Stock("Red bead", listOf(1), true, false),
            Stock("Yellow bead", listOf(1), true, false),
            Stock("Black bead", listOf(1), true, false),
            Stock("White bead", listOf(1), true, false),
            Stock("Logs", listOf(100, 200, 500, 1000), true, false),
            Stock("Magic logs", listOf(100, 200, 500, 1000), true, false),
            Stock("Yew logs", listOf(100, 200, 500, 1000), true, false),
            Stock("Maple logs", listOf(100, 200, 500, 1000), true, false),
            Stock("Willow logs", listOf(100, 200, 500, 1000), true, false),
            Stock("Oak logs", listOf(100, 200, 500, 1000), true, false),
            Stock("Steel nails", listOf(100, 200, 500, 1000), false, false),
            Stock("Diamond", listOf(1, 2, 5, 10), true, false),
            Stock("Ruby", listOf(1, 2, 5, 10), true, false),
            Stock("Emerald", listOf(1, 2, 5, 10), true, false),
            Stock("Sapphire", listOf(1, 2, 5, 10), true, false),
            Stock("Opal", listOf(10, 20, 50, 100), false, false),
            Stock("Jade", listOf(10, 20, 50, 100), false, false),
            Stock("Red topaz", listOf(10, 20, 50, 100), false, false),
            Stock("Dragonstone", listOf(1, 2, 5, 10), true, false),
            Stock("Uncut diamond", listOf(1, 2, 5, 10), true, false),
            Stock("Uncut ruby", listOf(1, 2, 5, 10), true, false),
            Stock("Uncut emerald", listOf(1, 2, 5, 10), true, false),
            Stock("Uncut sapphire", listOf(1, 2, 5, 10), true, false),
            Stock("Uncut opal", listOf(10, 20, 50, 100), false, false),
            Stock("Uncut jade", listOf(10, 20, 50, 100), false, false),
            Stock("Uncut red topaz", listOf(10, 20, 50, 100), false, false),
            Stock("Uncut dragonstone", listOf(1, 2, 5, 10), true, false),
            Stock("Gold ring", listOf(1), false, false),
            Stock("Sapphire ring", listOf(1), false, false),
            Stock("Emerald ring", listOf(1), false, false),
            Stock("Ruby ring", listOf(1), false, false),
            Stock("Diamond ring", listOf(1), false, false),
            Stock("Dragonstone ring", listOf(1), false, false),
            Stock("Gold necklace", listOf(1), false, false),
            Stock("Sapphire necklace", listOf(1), false, false),
            Stock("Emerald necklace", listOf(1), false, false),
            Stock("Ruby necklace", listOf(1), false, false),
            Stock("Diamond necklace", listOf(1), false, false),
            Stock("Dragon necklace", listOf(1), false, false),
            Stock("Amulet of glory(4)", listOf(1), true, false),
            Stock("Amulet of strength", listOf(1), true, false),
            Stock("Amulet of magic", listOf(1), true, false),
            Stock("Amulet of defence", listOf(1), true, false),
            Stock("Amulet of power", listOf(1), true, false),
            Stock("Unblessed symbol", listOf(1), false, false),
            Stock("Holy symbol", listOf(1), false, false),
            Stock("Unpowered symbol", listOf(1), false, false),
            Stock("Unholy symbol", listOf(1), false, false),
            Stock("Cowhide", listOf(100, 200, 500, 1000), true, false),
            Stock("Black dragonhide", listOf(100, 200, 500, 1000), true, false),
            Stock("Red dragonhide", listOf(100, 200, 500, 1000), true, false),
            Stock("Blue dragonhide", listOf(100, 200, 500, 1000), true, false),
            Stock("Green dragonhide", listOf(100, 200, 500, 1000), true, false),
            Stock("Bow string", listOf(100, 200, 500, 1000), true, false),
            Stock("Flax", listOf(100, 200, 500, 1000), true, false),
            Stock("Cake", listOf(10, 20, 50, 100), false, false),
            Stock("Chocolate cake", listOf(10, 20, 50, 100), false, false),
            Stock("Chef's hat", listOf(1), false, false),
            Stock("Pumpkin", listOf(1), false, false),
            Stock("Easter egg", listOf(1), false, false),
            Stock("Spinach roll", listOf(10, 20, 50, 100), false, false),
            Stock("Kebab", listOf(10, 20, 50, 100), false, false),
            Stock("Chocolate bar", listOf(10, 20, 50, 100), false, false),
            Stock("Chocolate dust", listOf(10, 20, 50, 100), false, false),
            Stock("Jug of wine", listOf(10, 20, 50, 100), false, false),
            Stock("Stew", listOf(10, 20, 50, 100), false, false),
            Stock("Cooked meat", listOf(10, 20, 50, 100), false, false),
            Stock("Toad's legs", listOf(10, 20, 50, 100), false, false),
            Stock("Plain pizza", listOf(10, 20, 50, 100), false, false),
            Stock("Meat pizza", listOf(10, 20, 50, 100), false, false),
            Stock("Anchovy pizza", listOf(10, 20, 50, 100), false, false),
            Stock("Pineapple pizza", listOf(10, 20, 50, 100), false, false),
            Stock("Bread", listOf(10, 20, 50, 100), false, false),
            Stock("Apple pie", listOf(10, 20, 50, 100), false, false),
            Stock("Redberry pie", listOf(10, 20, 50, 100), false, false),
            Stock("Meat pie", listOf(10, 20, 50, 100), false, false),
            Stock("Bronze bar", listOf(100, 200, 500, 1000), false, false),
            Stock("Iron bar", listOf(100, 200, 500, 1000), false, false),
            Stock("Steel bar", listOf(100, 200, 500, 1000), false, false),
            Stock("Silver bar", listOf(100, 200, 500, 1000), false, false),
            Stock("Gold bar", listOf(100, 200, 500, 1000), false, false),
            Stock("Mithril bar", listOf(100, 200, 500, 1000), false, false),
            Stock("Adamantite bar", listOf(100, 200, 500, 1000), false, false),
            Stock("Runite bar", listOf(100, 200, 500, 1000), false, false),
            Stock("Shield left half", listOf(1), false, false),
            Stock("Shield right half", listOf(1), false, false),
            Stock("Antifire potion(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Lantadyme", listOf(10, 20, 50, 100), false, false),
            Stock("Blue d'hide vambraces", listOf(1), false, true),
            Stock("Red d'hide vambraces", listOf(1), false, true),
            Stock("Black d'hide vambraces", listOf(1), false, true),
            Stock("Blue d'hide chaps", listOf(1), false, true),
            Stock("Red d'hide chaps", listOf(1), false, true),
            Stock("Black d'hide chaps", listOf(1), false, true),
            Stock("Blue d'hide body", listOf(1), false, true),
            Stock("Red d'hide body", listOf(1), false, true),
            Stock("Black d'hide body", listOf(1), false, true),
            Stock("Ranger boots", listOf(1), false, false),
            Stock("Wizard boots", listOf(1), false, false),
            Stock("Robin hood hat", listOf(1), false, false),
            Stock("Black platebody (t)", listOf(1), false, false),
            Stock("Black platelegs (t)", listOf(1), false, false),
            Stock("Black full helm (t)", listOf(1), false, false),
            Stock("Black kiteshield (t)", listOf(1), false, false),
            Stock("Black platebody (g)", listOf(1), false, false),
            Stock("Black platelegs (g)", listOf(1), false, false),
            Stock("Black full helm (g)", listOf(1), false, false),
            Stock("Black kiteshield (g)", listOf(1), false, false),
            Stock("Adamant platebody (t)", listOf(1), false, false),
            Stock("Adamant platelegs (t)", listOf(1), false, false),
            Stock("Adamant kiteshield (t)", listOf(1), false, false),
            Stock("Adamant full helm (t)", listOf(1), false, false),
            Stock("Adamant platebody (g)", listOf(1), false, false),
            Stock("Adamant platelegs (g)", listOf(1), false, false),
            Stock("Adamant kiteshield (g)", listOf(1), false, false),
            Stock("Adamant full helm (g)", listOf(1), false, false),
            Stock("Rune platebody (g)", listOf(1), false, false),
            Stock("Rune platelegs (g)", listOf(1), false, false),
            Stock("Rune full helm (g)", listOf(1), false, false),
            Stock("Rune kiteshield (g)", listOf(1), false, false),
            Stock("Rune platebody (t)", listOf(1), false, false),
            Stock("Rune platelegs (t)", listOf(1), false, false),
            Stock("Rune full helm (t)", listOf(1), false, false),
            Stock("Rune kiteshield (t)", listOf(1), false, false),
            Stock("Highwayman mask", listOf(1), false, false),
            Stock("Blue beret", listOf(1), false, false),
            Stock("Black beret", listOf(1), false, false),
            Stock("White beret", listOf(1), false, false),
            Stock("Tan cavalier", listOf(1), false, false),
            Stock("Dark cavalier", listOf(1), false, false),
            Stock("Black cavalier", listOf(1), false, false),
            Stock("Red headband", listOf(1), false, false),
            Stock("Black headband", listOf(1), false, false),
            Stock("Brown headband", listOf(1), false, false),
            Stock("Pirate's hat", listOf(1), false, false),
            Stock("Zamorak platebody", listOf(1), false, false),
            Stock("Zamorak platelegs", listOf(1), false, false),
            Stock("Zamorak full helm", listOf(1), false, false),
            Stock("Zamorak kiteshield", listOf(1), false, false),
            Stock("Saradomin platebody", listOf(1), false, false),
            Stock("Saradomin platelegs", listOf(1), false, false),
            Stock("Saradomin full helm", listOf(1), false, false),
            Stock("Saradomin kiteshield", listOf(1), false, false),
            Stock("Guthix platebody", listOf(1), false, false),
            Stock("Guthix platelegs", listOf(1), false, false),
            Stock("Guthix full helm", listOf(1), false, false),
            Stock("Guthix kiteshield", listOf(1), false, false),
            Stock("Wolf bones", listOf(100, 200, 500, 1000), false, false),
            Stock("Achey tree logs", listOf(100, 200, 500, 1000), false, false),
            Stock("Mort myre fungus", listOf(10, 20, 50, 100), false, false),
            Stock("Super energy(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Super restore(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Magic potion(3)", listOf(10, 20, 50, 100), false, false),
            Stock("Lava battlestaff", listOf(1), false, false),
            Stock("Mystic lava staff", listOf(1), false, false),
            Stock("Black dart", listOf(100, 200, 500, 1000), false, false),
            Stock("Granite shield", listOf(1), false, false),
            Stock("Jogre bones", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw karambwan", listOf(100, 200, 500, 1000), false, false),
            Stock("Cooked karambwan", listOf(100, 200, 500, 1000), false, false),
            Stock("Raw slimy eel", listOf(100, 200, 500, 1000), false, false),
            Stock("Cooked slimy eel", listOf(100, 200, 500, 1000), false, false),
            Stock("Splitbark helm", listOf(1), false, false),
            Stock("Splitbark body", listOf(1), false, false),
            Stock("Splitbark legs", listOf(1), false, false),
            Stock("Splitbark gauntlets", listOf(1), false, false),
            Stock("Splitbark boots", listOf(1), false, false),
            Stock("Fine cloth", listOf(1, 2, 5, 10), false, false),
            Stock("Black plateskirt (t)", listOf(1), false, false),
            Stock("Black plateskirt (g)", listOf(1), false, false),
            Stock("Adamant plateskirt (t)", listOf(1), false, false),
            Stock("Adamant plateskirt (g)", listOf(1), false, false),
            Stock("Rune plateskirt (g)", listOf(1), false, false),
            Stock("Rune plateskirt (t)", listOf(1), false, false),
            Stock("Zamorak plateskirt", listOf(1), false, false),
            Stock("Saradomin plateskirt", listOf(1), false, false),
            Stock("Guthix plateskirt", listOf(1), false, false),
            Stock("Gilded platebody", listOf(1), false, false),
            Stock("Gilded platelegs", listOf(1), false, false),
            Stock("Gilded plateskirt", listOf(1), false, false),
            Stock("Gilded full helm", listOf(1), false, false),
            Stock("Gilded kiteshield", listOf(1), false, false),
            Stock("Saradomin page 1", listOf(1), false, false),
            Stock("Saradomin page 2", listOf(1), false, false),
            Stock("Saradomin page 3", listOf(1), false, false),
            Stock("Saradomin page 4", listOf(1), false, false),
            Stock("Zamorak page 1", listOf(1), false, false),
            Stock("Zamorak page 2", listOf(1), false, false),
            Stock("Zamorak page 3", listOf(1), false, false),
            Stock("Zamorak page 4", listOf(1), false, false),
            Stock("Guthix page 1", listOf(1), false, false),
            Stock("Guthix page 2", listOf(1), false, false),
            Stock("Guthix page 3", listOf(1), false, false),
            Stock("Guthix page 4", listOf(1), false, false),
            Stock("Mystic hat", listOf(1), false, false),
            Stock("Mystic robe top", listOf(1), false, false),
            Stock("Mystic robe bottom", listOf(1), false, false),
            Stock("Mystic gloves", listOf(1), false, false),
            Stock("Mystic boots", listOf(1), false, false),
            Stock("Mystic hat (dark)", listOf(1), false, false),
            Stock("Mystic robe top (dark)", listOf(1), false, false),
            Stock("Mystic robe bottom (dark)", listOf(1), false, false),
            Stock("Mystic gloves (dark)", listOf(1), false, false),
            Stock("Mystic boots (dark)", listOf(1), false, false),
            Stock("Mystic hat (light)", listOf(1), false, false),
            Stock("Mystic robe top (light)", listOf(1), false, false),
            Stock("Mystic robe bottom (light)", listOf(1), false, false),
            Stock("Mystic gloves (light)", listOf(1), false, false),
            Stock("Mystic boots (light)", listOf(1), false, false),
            Stock("Bronze boots", listOf(1), false, false),
            Stock("Iron boots", listOf(1), false, false),
            Stock("Steel boots", listOf(1), false, false),
            Stock("Black boots", listOf(1), false, false),
            Stock("Mithril boots", listOf(1), false, false),
            Stock("Adamant boots", listOf(1), false, false),
            Stock("Rune boots", listOf(1), false, true),
            Stock("Abyssal whip", listOf(1), false, true),
            Stock("Granite maul", listOf(1), false, true),
            Stock("Dragon scimitar", listOf(1), false, false),
            Stock("Ahrim's hood", listOf(1), false, false),
            Stock("Ahrim's staff", listOf(1), false, false),
            Stock("Ahrim's robetop", listOf(1), false, false),
            Stock("Ahrim's robeskirt", listOf(1), false, false),
            Stock("Dharok's helm", listOf(1), false, false),
            Stock("Dharok's greataxe", listOf(1), false, false),
            Stock("Dharok's platebody", listOf(1), false, false),
            Stock("Dharok's platelegs", listOf(1), false, false),
            Stock("Guthan's helm", listOf(1), false, false),
            Stock("Guthan's warspear", listOf(1), false, false),
            Stock("Guthan's platebody", listOf(1), false, false),
            Stock("Guthan's chainskirt", listOf(1), false, false),
            Stock("Karil's coif", listOf(1), false, false),
            Stock("Karil's crossbow", listOf(1), false, false),
            Stock("Karil's leathertop", listOf(1), false, false),
            Stock("Karil's leatherskirt", listOf(1), false, false),
            Stock("Bolt rack", listOf(100, 200, 500, 1000), false, true),
            Stock("Torag's helm", listOf(1), false, false),
            Stock("Torag's hammers", listOf(1), false, false),
            Stock("Torag's platebody", listOf(1), false, false),
            Stock("Torag's platelegs", listOf(1), false, false),
            Stock("Verac's helm", listOf(1), false, false),
            Stock("Verac's flail", listOf(1), false, false),
            Stock("Verac's brassard", listOf(1), false, false),
            Stock("Verac's plateskirt", listOf(1), false, false),
            Stock("Raw cave eel", listOf(100, 200, 500, 1000), false, false),
            Stock("Cave eel", listOf(100, 200, 500, 1000), false, false),
            Stock("Mining helmet", listOf(1), false, false),
            Stock("Bone spear", listOf(1), false, false),
            Stock("Bone club", listOf(1), false, false),
            Stock("Marigold seed", listOf(10, 20, 50, 100), false, false),
            Stock("Rosemary seed", listOf(10, 20, 50, 100), false, false),
            Stock("Nasturtium seed", listOf(10, 20, 50, 100), false, false),
            Stock("Woad seed", listOf(10, 20, 50, 100), false, false),
            Stock("Limpwurt seed", listOf(10, 20, 50, 100), false, false),
            Stock("Redberry seed", listOf(10, 20, 50, 100), false, false),
            Stock("Cadavaberry seed", listOf(10, 20, 50, 100), false, false),
            Stock("Dwellberry seed", listOf(10, 20, 50, 100), false, false),
            Stock("Jangerberry seed", listOf(10, 20, 50, 100), false, false),
            Stock("Whiteberry seed", listOf(10, 20, 50, 100), false, false),
            Stock("Poison ivy seed", listOf(10, 20, 50, 100), false, false),
            Stock("Cactus seed", listOf(1, 2, 5, 10), false, false),
            Stock("Belladonna seed", listOf(1, 2, 5, 10), false, false),
            Stock("Mushroom spore", listOf(1, 2, 5, 10), false, false),
            Stock("Apple tree seed", listOf(1, 2, 5, 10), false, false),
            Stock("Banana tree seed", listOf(1, 2, 5, 10), false, false),
            Stock("Orange tree seed", listOf(1, 2, 5, 10), false, false),
            Stock("Curry tree seed", listOf(1, 2, 5, 10), false, false),
            Stock("Pineapple seed", listOf(1, 2, 5, 10), false, false),
            Stock("Papaya tree seed", listOf(1, 2, 5, 10), false, false),
            Stock("Palm tree seed", listOf(1, 2, 5, 10), false, false),
            Stock("Calquat tree seed", listOf(1, 2, 5, 10), false, false),
            Stock("Guam seed", listOf(10, 20, 50, 100), false, false),
            Stock("Marrentill seed", listOf(10, 20, 50, 100), false, false),
            Stock("Tarromin seed", listOf(10, 20, 50, 100), false, false),
            Stock("Harralander seed", listOf(10, 20, 50, 100), false, false),
            Stock("Ranarr seed", listOf(10, 20, 50, 100), false, false),
            Stock("Toadflax seed", listOf(10, 20, 50, 100), false, false),
            Stock("Irit seed", listOf(10, 20, 50, 100), false, false),
            Stock("Avantoe seed", listOf(10, 20, 50, 100), false, false),
            Stock("Kwuarm seed", listOf(10, 20, 50, 100), false, false),
            Stock("Snapdragon seed", listOf(10, 20, 50, 100), false, false),
            Stock("Cadantine seed", listOf(10, 20, 50, 100), false, false),
            Stock("Lantadyme seed", listOf(10, 20, 50, 100), false, false),
            Stock("Dwarf weed seed", listOf(10, 20, 50, 100), false, false),
            Stock("Torstol seed", listOf(10, 20, 50, 100), false, false),
            Stock("Barley seed", listOf(10, 20, 50, 100), false, false),
            Stock("Jute seed", listOf(10, 20, 50, 100), false, false),
            Stock("Hammerstone seed", listOf(10, 20, 50, 100), false, false),
            Stock("Asgarnian seed", listOf(10, 20, 50, 100), false, false),
            Stock("Yanillian seed", listOf(10, 20, 50, 100), false, false),
            Stock("Krandorian seed", listOf(10, 20, 50, 100), false, false),
            Stock("Wildblood seed", listOf(10, 20, 50, 100), false, false),
            Stock("Acorn", listOf(1, 2, 5, 10), false, false),
            Stock("Willow seed", listOf(1, 2, 5, 10), false, false),
            Stock("Maple seed", listOf(1, 2, 5, 10), false, false),
            Stock("Yew seed", listOf(1, 2, 5, 10), false, false),
            Stock("Magic seed", listOf(1, 2, 5, 10), false, false),
            Stock("Potato seed", listOf(10, 20, 50, 100), false, false),
            Stock("Onion seed", listOf(10, 20, 50, 100), false, false),
            Stock("Sweetcorn seed", listOf(10, 20, 50, 100), false, false),
            Stock("Watermelon seed", listOf(10, 20, 50, 100), false, false),
            Stock("Tomato seed", listOf(10, 20, 50, 100), false, false),
            Stock("Strawberry seed", listOf(10, 20, 50, 100), false, false),
            Stock("Cabbage seed", listOf(10, 20, 50, 100), false, false),
            Stock("Gardening trowel", listOf(1), false, false),
            Stock("Secateurs", listOf(1), false, false),
            Stock("Watering can", listOf(1), false, false),
            Stock("Rake", listOf(1), false, false),
            Stock("Seed dibber", listOf(1), false, false),
            Stock("Empty plant pot", listOf(1, 2, 5, 10), false, false),
            Stock("Basket", listOf(10, 20, 50, 100), false, false),
            Stock("Empty sack", listOf(10, 20, 50, 100), false, false),
            Stock("Tiara", listOf(1), false, false),
            Stock("Air tiara", listOf(1), false, false),
            Stock("Mind tiara", listOf(1), false, false),
            Stock("Water tiara", listOf(1), false, false),
            Stock("Body tiara", listOf(1), false, false),
            Stock("Earth tiara", listOf(1), false, false),
            Stock("Fire tiara", listOf(1), false, false),
            Stock("Cosmic tiara", listOf(1), false, false),
            Stock("Nature tiara", listOf(1), false, false),
            Stock("Chaos tiara", listOf(1), false, false),
            Stock("Death tiara", listOf(1), false, false),
            Stock("Dragon dagger(p+)", listOf(1), false, true),
            Stock("Dragon dagger(p++)", listOf(1), false, true),
            Stock("Compost", listOf(10, 20, 50, 100), false, false),
            Stock("Plant cure", listOf(10, 20, 50, 100), false, false),
            Stock("Teak logs", listOf(100, 200, 500, 1000), false, false),
            Stock("Toktz-xil-ul", listOf(1), false, false),
            Stock("Toktz-xil-ak", listOf(1), false, false),
            Stock("Toktz-ket-xil", listOf(1), false, true),
            Stock("Toktz-xil-ek", listOf(1), false, false),
            Stock("Toktz-mej-tal", listOf(1), false, false),
            Stock("Tzhaar-ket-em", listOf(1), false, false),
            Stock("Tzhaar-ket-om", listOf(1), false, true),
            Stock("Obsidian cape", listOf(1), false, true),
            Stock("Amulet of fury", listOf(1), false, true),
            Stock("Onyx amulet", listOf(1), false, false),
            Stock("Granite legs", listOf(1), false, false),
            Stock("Mage's book", listOf(1), false, false),
            Stock("Beginner wand", listOf(1), false, false),
            Stock("Apprentice wand", listOf(1), false, false),
            Stock("Teacher wand", listOf(1), false, false),
            Stock("Master wand", listOf(1), false, false),
            Stock("Infinity top", listOf(1), false, false),
            Stock("Infinity hat", listOf(1), false, false),
            Stock("Infinity boots", listOf(1), false, false),
            Stock("Infinity gloves", listOf(1), false, false),
            Stock("Infinity bottoms", listOf(1), false, false),
            Stock("Blue skirt (g)", listOf(1), false, false),
            Stock("Blue wizard robe (g)", listOf(1), false, false),
            Stock("Blue wizard hat (g)", listOf(1), false, false),
            Stock("Pure essence", listOf(100, 200, 500, 1000, 2000), true, false),
            Stock("3rd Age range top", listOf(1), false, false),
            Stock("3rd Age range legs", listOf(1), false, false),
            Stock("3rd Age range coif", listOf(1), false, false),
            Stock("3rd Age vambraces", listOf(1), false, false),
            Stock("3rd Age robe top", listOf(1), false, false),
            Stock("3rd Age robe", listOf(1), false, false),
            Stock("3rd Age mage hat", listOf(1), false, false),
            Stock("3rd Age amulet", listOf(1), false, false),
            Stock("3rd Age platelegs", listOf(1), false, false),
            Stock("3rd Age platebody", listOf(1), false, false),
            Stock("3rd Age full helmet", listOf(1), false, false),
            Stock("3rd Age kiteshield", listOf(1), false, false),
            Stock("Zamorak bracers", listOf(1), false, false),
            Stock("Zamorak d'hide body", listOf(1), false, false),
            Stock("Zamorak chaps", listOf(1), false, false),
            Stock("Zamorak coif", listOf(1), false, false),
            Stock("Guthix bracers", listOf(1), false, false),
            Stock("Guthix d'hide body", listOf(1), false, false),
            Stock("Guthix chaps", listOf(1), false, false),
            Stock("Guthix coif", listOf(1), false, false),
            Stock("Saradomin bracers", listOf(1), false, false),
            Stock("Saradomin d'hide body", listOf(1), false, false),
            Stock("Saradomin chaps", listOf(1), false, false),
            Stock("Saradomin coif", listOf(1), false, false),
            Stock("Saradomin crozier", listOf(1), false, false),
            Stock("Guthix crozier", listOf(1), false, false),
            Stock("Zamorak crozier", listOf(1), false, false),
            Stock("Saradomin cloak", listOf(1), false, false),
            Stock("Guthix cloak", listOf(1), false, false),
            Stock("Zamorak cloak", listOf(1), false, false),
            Stock("Saradomin mitre", listOf(1), false, false),
            Stock("Guthix mitre", listOf(1), false, false),
            Stock("Zamorak mitre", listOf(1), false, false),
            Stock("Saradomin robe top", listOf(1), false, false),
            Stock("Zamorak robe top", listOf(1), false, false),
            Stock("Guthix robe top", listOf(1), false, false),
            Stock("Saradomin robe legs", listOf(1), false, false),
            Stock("Guthix robe legs", listOf(1), false, false),
            Stock("Zamorak robe legs", listOf(1), false, false),
            Stock("Saradomin stole", listOf(1), false, false),
            Stock("Guthix stole", listOf(1), false, false),
            Stock("Zamorak stole", listOf(1), false, false),
            Stock("Berserker necklace", listOf(1), false, false),
            Stock("Dark bow", listOf(1), false, false),
            Stock("Dragonfire shield", listOf(1), false, false),
            Stock("Draconic visage", listOf(1), false, false),
            Stock("Dragon full helm", listOf(1), false, false),
            Stock("Godsword blade", listOf(1), false, false),
            Stock("Armadyl godsword", listOf(1), false, false),
            Stock("Bandos godsword", listOf(1), false, false),
            Stock("Saradomin godsword", listOf(1), false, false),
            Stock("Zamorak godsword", listOf(1), false, false),
            Stock("Armadyl hilt", listOf(1), false, false),
            Stock("Bandos hilt", listOf(1), false, false),
            Stock("Saradomin hilt", listOf(1), false, false),
            Stock("Zamorak hilt", listOf(1), false, false),
            Stock("Godsword shard 1", listOf(1), false, false),
            Stock("Godsword shard 2", listOf(1), false, false),
            Stock("Godsword shard 3", listOf(1), false, false),
            Stock("Zamorakian spear", listOf(1), false, false),
            Stock("Armadyl helmet", listOf(1), false, false),
            Stock("Armadyl chestplate", listOf(1), false, false),
            Stock("Armadyl chainskirt", listOf(1), false, false),
            Stock("Bandos chestplate", listOf(1), false, false),
            Stock("Bandos tassets", listOf(1), false, false),
            Stock("Bandos boots", listOf(1), false, false),
            Stock("Saradomin sword", listOf(1), false, false),
            Stock("Dragon boots", listOf(1), false, false),
            Stock("Steam battlestaff", listOf(1), false, false),
            Stock("Mystic steam staff", listOf(1), false, false),
        )
    }
}
