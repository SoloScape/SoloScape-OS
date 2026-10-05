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
        val dropEligible: Boolean,
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
                val rewardPool = resolvedStock.filter { it.first.dropEligible }.toMutableList()
                val rewards = ArrayList<ItemServerType>()
                repeat(10) { index ->
                    val pool = if (index == 9 && rewards.none { prices.guidePrice(it.id) >= 500 }) {
                        rewardPool.filter { prices.guidePrice(it.second.id) >= 500 }
                    } else rewardPool
                    val reward = pool.randomOrNull() ?: return@repeat
                    rewardPool.remove(reward)
                    rewards += reward.second
                }
                for (item in rewards.shuffled()) {
                    player.invAdd(player.inv, item.internalName, 1, ignoreVirtualStorage = true)
                }
                val best = rewards.maxByOrNull { prices.guidePrice(it.id) }
                if (best != null) player.say("Follow for Drop party! Best drop: ${best.name}")

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

    public fun dropPartySize(player: Player): Int {
        val best = player.inv.filterNotNull { true }.maxOfOrNull {
            prices.guidePrice(it.id)
        } ?: return 4
        return when {
            best >= 1_000_000 -> 20
            best >= 800_000 -> 18
            best >= 600_000 -> 16
            best >= 400_000 -> 14
            best >= 200_000 -> 12
            best >= 100_000 -> 10
            best >= 25_000 -> 8
            best >= 10_000 -> 6
            else -> 4
        }
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
            Stock("Arrow shaft", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Strength potion(3)", listOf(10, 20, 50, 100), false, true, true),
            Stock("Attack potion(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Restore potion(3)", listOf(10, 20, 50, 100), true, true, true),
            Stock("Defence potion(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Prayer potion(3)", listOf(10, 20, 50, 100), true, true, true),
            Stock("Super attack(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Fishing potion(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Super strength(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Super defence(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Ranging potion(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Antipoison(3)", listOf(10, 20, 50, 100), true, true, true),
            Stock("Superantipoison(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Weapon poison", listOf(1, 2, 5, 10), false, false, true),
            Stock("Zamorak brew(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Eye of newt", listOf(10, 20, 50, 100), false, false, true),
            Stock("Red spiders' eggs", listOf(10, 20, 50, 100), true, false, true),
            Stock("Limpwurt root", listOf(10, 20, 50, 100), true, false, true),
            Stock("Snape grass", listOf(10, 20, 50, 100), true, false, true),
            Stock("Unicorn horn", listOf(10, 20, 50, 100), true, false, true),
            Stock("White berries", listOf(10, 20, 50, 100), false, false, true),
            Stock("Blue dragon scale", listOf(10, 20, 50, 100), false, false, true),
            Stock("Wine of Zamorak", listOf(10, 20, 50, 100), false, false, true),
            Stock("Jangerberries", listOf(10, 20, 50, 100), false, false, true),
            Stock("Guam leaf", listOf(10, 20, 50, 100), true, false, true),
            Stock("Marrentill", listOf(10, 20, 50, 100), true, false, true),
            Stock("Tarromin", listOf(10, 20, 50, 100), true, false, true),
            Stock("Harralander", listOf(10, 20, 50, 100), true, false, true),
            Stock("Ranarr weed", listOf(10, 20, 50, 100), true, false, true),
            Stock("Irit leaf", listOf(10, 20, 50, 100), false, false, true),
            Stock("Avantoe", listOf(10, 20, 50, 100), false, false, true),
            Stock("Kwuarm", listOf(10, 20, 50, 100), false, false, true),
            Stock("Cadantine", listOf(10, 20, 50, 100), false, false, true),
            Stock("Dwarf weed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Torstol", listOf(10, 20, 50, 100), false, false, true),
            Stock("Feather", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Shrimps", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw shrimps", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Anchovies", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw anchovies", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Sardine", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw sardine", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Salmon", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw salmon", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Trout", listOf(100, 200, 500, 1000), true, true, true),
            Stock("Raw trout", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Cod", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw cod", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw herring", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Herring", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw pike", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Pike", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw mackerel", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Mackerel", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw tuna", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Tuna", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw bass", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Bass", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw swordfish", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Swordfish", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw lobster", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Lobster", listOf(100, 200, 500, 1000), true, true, true),
            Stock("Raw shark", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Shark", listOf(100, 200, 500, 1000), true, true, true),
            Stock("Raw manta ray", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Manta ray", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw sea turtle", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Sea turtle", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Casket", listOf(1), false, false, true),
            Stock("Oyster", listOf(1), false, false, true),
            Stock("Clay", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Copper ore", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Tin ore", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Iron ore", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Silver ore", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Gold ore", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Mithril ore", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Adamantite ore", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Runite ore", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Coal", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Strange fruit", listOf(1), false, false, true),
            Stock("Bones", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Burnt bones", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Bat bones", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Big bones", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Babydragon bones", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Dragon bones", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Fire rune", listOf(500, 1000, 2000, 5000, 10000), false, false, true),
            Stock("Water rune", listOf(500, 1000, 2000, 5000, 10000), false, false, true),
            Stock("Air rune", listOf(500, 1000, 2000, 5000, 10000), true, false, true),
            Stock("Earth rune", listOf(500, 1000, 2000, 5000, 10000), false, false, true),
            Stock("Mind rune", listOf(500, 1000, 2000, 5000, 10000), false, false, true),
            Stock("Body rune", listOf(500, 1000, 2000, 5000, 10000), false, false, true),
            Stock("Death rune", listOf(100, 200, 500, 1000), false, true, true),
            Stock("Nature rune", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Chaos rune", listOf(100, 200, 500, 1000), false, true, true),
            Stock("Law rune", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Cosmic rune", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Blood rune", listOf(100, 200, 500, 1000), false, true, true),
            Stock("Soul rune", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Bronze thrownaxe", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Iron thrownaxe", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Steel thrownaxe", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Mithril thrownaxe", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Adamant thrownaxe", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Rune thrownaxe", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Bronze dart", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Iron dart", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Steel dart", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Mithril dart", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Adamant dart", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Rune dart", listOf(100, 200, 500, 1000), false, true, true),
            Stock("Maple longbow", listOf(1), false, false, true),
            Stock("Maple shortbow", listOf(1), false, false, true),
            Stock("Yew longbow", listOf(1), false, false, true),
            Stock("Yew shortbow", listOf(1), false, false, true),
            Stock("Magic longbow", listOf(1), false, false, true),
            Stock("Magic shortbow", listOf(1), false, true, true),
            Stock("Iron knife", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Bronze knife", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Steel knife", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Mithril knife", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Adamant knife", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Rune knife", listOf(100, 200, 500, 1000), false, true, true),
            Stock("Black knife", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Bronze bolts", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Opal bolts", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Pearl bolts", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Barbed bolts", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Bronze arrow", listOf(500, 1000, 2000, 5000, 10000), false, false, true),
            Stock("Iron arrow", listOf(500, 1000, 2000, 5000, 10000), false, false, true),
            Stock("Steel arrow", listOf(500, 1000, 2000, 5000, 10000), false, true, true),
            Stock("Mithril arrow", listOf(100, 200, 500, 1000), false, true, true),
            Stock("Adamant arrow", listOf(100, 200, 500, 1000), false, true, true),
            Stock("Rune arrow", listOf(100, 200, 500, 1000), false, true, true),
            Stock("Spade", listOf(1), false, false, true),
            Stock("Christmas cracker", listOf(1), false, false, true),
            Stock("Tooth half of key", listOf(1), false, false, true),
            Stock("Loop half of key", listOf(1), false, false, true),
            Stock("Crystal key", listOf(1), false, false, true),
            Stock("Muddy key", listOf(1), false, false, true),
            Stock("Zamorak monk bottom", listOf(1), false, false, true),
            Stock("Zamorak monk top", listOf(1), false, false, true),
            Stock("Red partyhat", listOf(1), false, false, true),
            Stock("Yellow partyhat", listOf(1), false, false, true),
            Stock("Blue partyhat", listOf(1), false, false, true),
            Stock("Green partyhat", listOf(1), false, false, true),
            Stock("Purple partyhat", listOf(1), false, false, true),
            Stock("White partyhat", listOf(1), false, false, true),
            Stock("Santa hat", listOf(1), false, false, true),
            Stock("Green halloween mask", listOf(1), false, false, true),
            Stock("Blue halloween mask", listOf(1), false, false, true),
            Stock("Red halloween mask", listOf(1), false, false, true),
            Stock("Leather gloves", listOf(1), false, false, true),
            Stock("Leather boots", listOf(1), false, false, true),
            Stock("Leather vambraces", listOf(1), false, false, true),
            Stock("Green d'hide vambraces", listOf(1), false, false, true),
            Stock("Steel platelegs", listOf(1), false, false, true),
            Stock("Mithril platelegs", listOf(1), false, false, true),
            Stock("Adamant platelegs", listOf(1), false, false, true),
            Stock("Black platelegs", listOf(1), false, false, true),
            Stock("Rune platelegs", listOf(1), false, false, true),
            Stock("Steel plateskirt", listOf(1), false, false, true),
            Stock("Mithril plateskirt", listOf(1), false, false, true),
            Stock("Black plateskirt", listOf(1), false, false, true),
            Stock("Adamant plateskirt", listOf(1), false, false, true),
            Stock("Rune plateskirt", listOf(1), false, false, true),
            Stock("Leather chaps", listOf(1), false, false, true),
            Stock("Studded chaps", listOf(1), false, false, true),
            Stock("Green d'hide chaps", listOf(1), false, false, true),
            Stock("Steel chainbody", listOf(1), false, false, true),
            Stock("Black chainbody", listOf(1), false, false, true),
            Stock("Mithril chainbody", listOf(1), false, false, true),
            Stock("Adamant chainbody", listOf(1), false, false, true),
            Stock("Rune chainbody", listOf(1), false, false, true),
            Stock("Steel platebody", listOf(1), false, false, true),
            Stock("Mithril platebody", listOf(1), false, false, true),
            Stock("Adamant platebody", listOf(1), false, false, true),
            Stock("Black platebody", listOf(1), false, false, true),
            Stock("Rune platebody", listOf(1), false, false, true),
            Stock("Leather body", listOf(1), false, false, true),
            Stock("Hardleather body", listOf(1), false, false, true),
            Stock("Studded body", listOf(1), false, false, true),
            Stock("Green d'hide body", listOf(1), false, false, true),
            Stock("Steel med helm", listOf(1), false, false, true),
            Stock("Mithril med helm", listOf(1), false, false, true),
            Stock("Adamant med helm", listOf(1), false, false, true),
            Stock("Rune med helm", listOf(1), false, false, true),
            Stock("Dragon med helm", listOf(1), false, false, true),
            Stock("Black med helm", listOf(1), false, false, true),
            Stock("Steel full helm", listOf(1), false, false, true),
            Stock("Mithril full helm", listOf(1), false, false, true),
            Stock("Adamant full helm", listOf(1), false, false, true),
            Stock("Rune full helm", listOf(1), false, true, true),
            Stock("Black full helm", listOf(1), false, false, true),
            Stock("Leather cowl", listOf(1), false, false, true),
            Stock("Coif", listOf(1), false, false, true),
            Stock("Steel sq shield", listOf(1), false, false, true),
            Stock("Black sq shield", listOf(1), false, false, true),
            Stock("Mithril sq shield", listOf(1), false, false, true),
            Stock("Adamant sq shield", listOf(1), false, false, true),
            Stock("Rune sq shield", listOf(1), false, false, true),
            Stock("Dragon sq shield", listOf(1), false, false, true),
            Stock("Steel kiteshield", listOf(1), false, false, true),
            Stock("Black kiteshield", listOf(1), false, false, true),
            Stock("Mithril kiteshield", listOf(1), false, false, true),
            Stock("Adamant kiteshield", listOf(1), false, false, true),
            Stock("Rune kiteshield", listOf(1), false, true, true),
            Stock("Steel dagger", listOf(1), false, false, true),
            Stock("Mithril dagger", listOf(1), false, false, true),
            Stock("Adamant dagger", listOf(1), false, false, true),
            Stock("Rune dagger", listOf(1), false, false, true),
            Stock("Dragon dagger", listOf(1), false, true, true),
            Stock("Black dagger", listOf(1), false, false, true),
            Stock("Dragon dagger(p)", listOf(1), false, true, true),
            Stock("Bronze pickaxe", listOf(1), false, false, true),
            Stock("Iron pickaxe", listOf(1), false, false, true),
            Stock("Steel pickaxe", listOf(1), false, false, true),
            Stock("Adamant pickaxe", listOf(1), false, false, true),
            Stock("Mithril pickaxe", listOf(1), false, false, true),
            Stock("Rune pickaxe", listOf(1), false, false, true),
            Stock("Steel sword", listOf(1), false, false, true),
            Stock("Black sword", listOf(1), false, false, true),
            Stock("Mithril sword", listOf(1), false, false, true),
            Stock("Adamant sword", listOf(1), false, false, true),
            Stock("Rune sword", listOf(1), false, false, true),
            Stock("Steel longsword", listOf(1), false, false, true),
            Stock("Black longsword", listOf(1), false, false, true),
            Stock("Mithril longsword", listOf(1), false, false, true),
            Stock("Adamant longsword", listOf(1), false, false, true),
            Stock("Rune longsword", listOf(1), false, true, true),
            Stock("Dragon longsword", listOf(1), false, false, true),
            Stock("Steel 2h sword", listOf(1), false, false, true),
            Stock("Black 2h sword", listOf(1), false, false, true),
            Stock("Mithril 2h sword", listOf(1), false, false, true),
            Stock("Adamant 2h sword", listOf(1), false, false, true),
            Stock("Rune 2h sword", listOf(1), false, true, true),
            Stock("Steel scimitar", listOf(1), false, false, true),
            Stock("Black scimitar", listOf(1), false, false, true),
            Stock("Mithril scimitar", listOf(1), false, false, true),
            Stock("Adamant scimitar", listOf(1), false, false, true),
            Stock("Rune scimitar", listOf(1), false, true, true),
            Stock("Steel warhammer", listOf(1), false, false, true),
            Stock("Black warhammer", listOf(1), false, false, true),
            Stock("Mithril warhammer", listOf(1), false, false, true),
            Stock("Adamant warhammer", listOf(1), false, false, true),
            Stock("Rune warhammer", listOf(1), false, false, true),
            Stock("Iron axe", listOf(1), false, false, true),
            Stock("Bronze axe", listOf(1), false, false, true),
            Stock("Steel axe", listOf(1), false, false, true),
            Stock("Mithril axe", listOf(1), true, false, true),
            Stock("Adamant axe", listOf(1), true, false, true),
            Stock("Rune axe", listOf(1), true, false, true),
            Stock("Black axe", listOf(1), false, false, true),
            Stock("Steel battleaxe", listOf(1), false, false, true),
            Stock("Black battleaxe", listOf(1), false, false, true),
            Stock("Mithril battleaxe", listOf(1), false, false, true),
            Stock("Adamant battleaxe", listOf(1), false, false, true),
            Stock("Rune battleaxe", listOf(1), false, true, true),
            Stock("Dragon battleaxe", listOf(1), false, false, true),
            Stock("Staff", listOf(1), false, false, true),
            Stock("Staff of air", listOf(1), false, false, true),
            Stock("Staff of water", listOf(1), false, false, true),
            Stock("Staff of earth", listOf(1), false, false, true),
            Stock("Staff of fire", listOf(1), false, false, true),
            Stock("Battlestaff", listOf(10, 20, 50, 100), true, false, true),
            Stock("Fire battlestaff", listOf(1), false, false, true),
            Stock("Water battlestaff", listOf(1), false, false, true),
            Stock("Air battlestaff", listOf(1), false, false, true),
            Stock("Earth battlestaff", listOf(1), false, false, true),
            Stock("Mystic fire staff", listOf(1), false, false, true),
            Stock("Mystic water staff", listOf(1), false, false, true),
            Stock("Mystic air staff", listOf(1), false, false, true),
            Stock("Mystic earth staff", listOf(1), false, false, true),
            Stock("Steel mace", listOf(1), false, false, true),
            Stock("Black mace", listOf(1), false, false, true),
            Stock("Mithril mace", listOf(1), false, false, true),
            Stock("Adamant mace", listOf(1), false, false, true),
            Stock("Rune mace", listOf(1), false, false, true),
            Stock("Dragon mace", listOf(1), false, false, true),
            Stock("Rune essence", listOf(100, 200, 500, 1000, 2000), true, false, true),
            Stock("Air talisman", listOf(1), true, false, true),
            Stock("Earth talisman", listOf(1), true, false, true),
            Stock("Fire talisman", listOf(1), true, false, true),
            Stock("Water talisman", listOf(1), true, false, true),
            Stock("Body talisman", listOf(1), true, false, true),
            Stock("Mind talisman", listOf(1), true, false, true),
            Stock("Chaos talisman", listOf(1), true, false, true),
            Stock("Cosmic talisman", listOf(1), true, false, true),
            Stock("Death talisman", listOf(1), false, false, true),
            Stock("Nature talisman", listOf(1), true, false, true),
            Stock("Red bead", listOf(1), true, false, true),
            Stock("Yellow bead", listOf(1), true, false, true),
            Stock("Black bead", listOf(1), true, false, true),
            Stock("White bead", listOf(1), true, false, true),
            Stock("Logs", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Magic logs", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Yew logs", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Maple logs", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Willow logs", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Oak logs", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Steel nails", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Diamond", listOf(1, 2, 5, 10), true, false, true),
            Stock("Ruby", listOf(1, 2, 5, 10), true, false, true),
            Stock("Emerald", listOf(1, 2, 5, 10), true, false, true),
            Stock("Sapphire", listOf(1, 2, 5, 10), true, false, true),
            Stock("Opal", listOf(10, 20, 50, 100), false, false, true),
            Stock("Jade", listOf(10, 20, 50, 100), false, false, true),
            Stock("Red topaz", listOf(10, 20, 50, 100), false, false, true),
            Stock("Dragonstone", listOf(1, 2, 5, 10), true, false, true),
            Stock("Uncut diamond", listOf(1, 2, 5, 10), true, false, true),
            Stock("Uncut ruby", listOf(1, 2, 5, 10), true, false, true),
            Stock("Uncut emerald", listOf(1, 2, 5, 10), true, false, true),
            Stock("Uncut sapphire", listOf(1, 2, 5, 10), true, false, true),
            Stock("Uncut opal", listOf(10, 20, 50, 100), false, false, true),
            Stock("Uncut jade", listOf(10, 20, 50, 100), false, false, true),
            Stock("Uncut red topaz", listOf(10, 20, 50, 100), false, false, true),
            Stock("Uncut dragonstone", listOf(1, 2, 5, 10), true, false, true),
            Stock("Gold ring", listOf(1), false, false, true),
            Stock("Sapphire ring", listOf(1), false, false, true),
            Stock("Emerald ring", listOf(1), false, false, true),
            Stock("Ruby ring", listOf(1), false, false, true),
            Stock("Diamond ring", listOf(1), false, false, true),
            Stock("Dragonstone ring", listOf(1), false, false, true),
            Stock("Gold necklace", listOf(1), false, false, true),
            Stock("Sapphire necklace", listOf(1), false, false, true),
            Stock("Emerald necklace", listOf(1), false, false, true),
            Stock("Ruby necklace", listOf(1), false, false, true),
            Stock("Diamond necklace", listOf(1), false, false, true),
            Stock("Dragon necklace", listOf(1), false, false, true),
            Stock("Amulet of glory(4)", listOf(1), true, false, true),
            Stock("Amulet of strength", listOf(1), true, false, true),
            Stock("Amulet of magic", listOf(1), true, false, true),
            Stock("Amulet of defence", listOf(1), true, false, true),
            Stock("Amulet of power", listOf(1), true, false, true),
            Stock("Unblessed symbol", listOf(1), false, false, true),
            Stock("Holy symbol", listOf(1), false, false, true),
            Stock("Unpowered symbol", listOf(1), false, false, true),
            Stock("Unholy symbol", listOf(1), false, false, true),
            Stock("Cowhide", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Black dragonhide", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Red dragonhide", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Blue dragonhide", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Green dragonhide", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Bow string", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Flax", listOf(100, 200, 500, 1000), true, false, true),
            Stock("Cake", listOf(10, 20, 50, 100), false, false, true),
            Stock("Chocolate cake", listOf(10, 20, 50, 100), false, false, true),
            Stock("Chef's hat", listOf(1), false, false, true),
            Stock("Pumpkin", listOf(1), false, false, true),
            Stock("Easter egg", listOf(1), false, false, true),
            Stock("Spinach roll", listOf(10, 20, 50, 100), false, false, true),
            Stock("Kebab", listOf(10, 20, 50, 100), false, false, true),
            Stock("Chocolate bar", listOf(10, 20, 50, 100), false, false, true),
            Stock("Chocolate dust", listOf(10, 20, 50, 100), false, false, true),
            Stock("Jug of wine", listOf(10, 20, 50, 100), false, false, true),
            Stock("Stew", listOf(10, 20, 50, 100), false, false, true),
            Stock("Cooked meat", listOf(10, 20, 50, 100), false, false, true),
            Stock("Toad's legs", listOf(10, 20, 50, 100), false, false, true),
            Stock("Plain pizza", listOf(10, 20, 50, 100), false, false, true),
            Stock("Meat pizza", listOf(10, 20, 50, 100), false, false, true),
            Stock("Anchovy pizza", listOf(10, 20, 50, 100), false, false, true),
            Stock("Pineapple pizza", listOf(10, 20, 50, 100), false, false, true),
            Stock("Bread", listOf(10, 20, 50, 100), false, false, true),
            Stock("Apple pie", listOf(10, 20, 50, 100), false, false, true),
            Stock("Redberry pie", listOf(10, 20, 50, 100), false, false, true),
            Stock("Meat pie", listOf(10, 20, 50, 100), false, false, true),
            Stock("Bronze bar", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Iron bar", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Steel bar", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Silver bar", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Gold bar", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Mithril bar", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Adamantite bar", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Runite bar", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Shield left half", listOf(1), false, false, true),
            Stock("Shield right half", listOf(1), false, false, true),
            Stock("Antifire potion(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Lantadyme", listOf(10, 20, 50, 100), false, false, true),
            Stock("Blue d'hide vambraces", listOf(1), false, true, true),
            Stock("Red d'hide vambraces", listOf(1), false, true, true),
            Stock("Black d'hide vambraces", listOf(1), false, true, true),
            Stock("Blue d'hide chaps", listOf(1), false, true, true),
            Stock("Red d'hide chaps", listOf(1), false, true, true),
            Stock("Black d'hide chaps", listOf(1), false, true, true),
            Stock("Blue d'hide body", listOf(1), false, true, true),
            Stock("Red d'hide body", listOf(1), false, true, true),
            Stock("Black d'hide body", listOf(1), false, true, true),
            Stock("Ranger boots", listOf(1), false, false, true),
            Stock("Wizard boots", listOf(1), false, false, true),
            Stock("Robin hood hat", listOf(1), false, false, true),
            Stock("Black platebody (t)", listOf(1), false, false, true),
            Stock("Black platelegs (t)", listOf(1), false, false, true),
            Stock("Black full helm (t)", listOf(1), false, false, true),
            Stock("Black kiteshield (t)", listOf(1), false, false, true),
            Stock("Black platebody (g)", listOf(1), false, false, true),
            Stock("Black platelegs (g)", listOf(1), false, false, true),
            Stock("Black full helm (g)", listOf(1), false, false, true),
            Stock("Black kiteshield (g)", listOf(1), false, false, true),
            Stock("Adamant platebody (t)", listOf(1), false, false, true),
            Stock("Adamant platelegs (t)", listOf(1), false, false, true),
            Stock("Adamant kiteshield (t)", listOf(1), false, false, true),
            Stock("Adamant full helm (t)", listOf(1), false, false, true),
            Stock("Adamant platebody (g)", listOf(1), false, false, true),
            Stock("Adamant platelegs (g)", listOf(1), false, false, true),
            Stock("Adamant kiteshield (g)", listOf(1), false, false, true),
            Stock("Adamant full helm (g)", listOf(1), false, false, true),
            Stock("Rune platebody (g)", listOf(1), false, false, true),
            Stock("Rune platelegs (g)", listOf(1), false, false, true),
            Stock("Rune full helm (g)", listOf(1), false, false, true),
            Stock("Rune kiteshield (g)", listOf(1), false, false, true),
            Stock("Rune platebody (t)", listOf(1), false, false, true),
            Stock("Rune platelegs (t)", listOf(1), false, false, true),
            Stock("Rune full helm (t)", listOf(1), false, false, true),
            Stock("Rune kiteshield (t)", listOf(1), false, false, true),
            Stock("Highwayman mask", listOf(1), false, false, true),
            Stock("Blue beret", listOf(1), false, false, true),
            Stock("Black beret", listOf(1), false, false, true),
            Stock("White beret", listOf(1), false, false, true),
            Stock("Tan cavalier", listOf(1), false, false, true),
            Stock("Dark cavalier", listOf(1), false, false, true),
            Stock("Black cavalier", listOf(1), false, false, true),
            Stock("Red headband", listOf(1), false, false, true),
            Stock("Black headband", listOf(1), false, false, true),
            Stock("Brown headband", listOf(1), false, false, true),
            Stock("Pirate's hat", listOf(1), false, false, true),
            Stock("Zamorak platebody", listOf(1), false, false, true),
            Stock("Zamorak platelegs", listOf(1), false, false, true),
            Stock("Zamorak full helm", listOf(1), false, false, true),
            Stock("Zamorak kiteshield", listOf(1), false, false, true),
            Stock("Saradomin platebody", listOf(1), false, false, true),
            Stock("Saradomin platelegs", listOf(1), false, false, true),
            Stock("Saradomin full helm", listOf(1), false, false, true),
            Stock("Saradomin kiteshield", listOf(1), false, false, true),
            Stock("Guthix platebody", listOf(1), false, false, true),
            Stock("Guthix platelegs", listOf(1), false, false, true),
            Stock("Guthix full helm", listOf(1), false, false, true),
            Stock("Guthix kiteshield", listOf(1), false, false, true),
            Stock("Wolf bones", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Achey tree logs", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Mort myre fungus", listOf(10, 20, 50, 100), false, false, true),
            Stock("Super energy(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Super restore(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Magic potion(3)", listOf(10, 20, 50, 100), false, false, true),
            Stock("Lava battlestaff", listOf(1), false, false, true),
            Stock("Mystic lava staff", listOf(1), false, false, true),
            Stock("Black dart", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Granite shield", listOf(1), false, false, true),
            Stock("Jogre bones", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw karambwan", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Cooked karambwan", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Raw slimy eel", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Cooked slimy eel", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Splitbark helm", listOf(1), false, false, true),
            Stock("Splitbark body", listOf(1), false, false, true),
            Stock("Splitbark legs", listOf(1), false, false, true),
            Stock("Splitbark gauntlets", listOf(1), false, false, true),
            Stock("Splitbark boots", listOf(1), false, false, true),
            Stock("Fine cloth", listOf(1, 2, 5, 10), false, false, true),
            Stock("Black plateskirt (t)", listOf(1), false, false, true),
            Stock("Black plateskirt (g)", listOf(1), false, false, true),
            Stock("Adamant plateskirt (t)", listOf(1), false, false, true),
            Stock("Adamant plateskirt (g)", listOf(1), false, false, true),
            Stock("Rune plateskirt (g)", listOf(1), false, false, true),
            Stock("Rune plateskirt (t)", listOf(1), false, false, true),
            Stock("Zamorak plateskirt", listOf(1), false, false, true),
            Stock("Saradomin plateskirt", listOf(1), false, false, true),
            Stock("Guthix plateskirt", listOf(1), false, false, true),
            Stock("Gilded platebody", listOf(1), false, false, true),
            Stock("Gilded platelegs", listOf(1), false, false, true),
            Stock("Gilded plateskirt", listOf(1), false, false, true),
            Stock("Gilded full helm", listOf(1), false, false, true),
            Stock("Gilded kiteshield", listOf(1), false, false, true),
            Stock("Saradomin page 1", listOf(1), false, false, true),
            Stock("Saradomin page 2", listOf(1), false, false, true),
            Stock("Saradomin page 3", listOf(1), false, false, true),
            Stock("Saradomin page 4", listOf(1), false, false, true),
            Stock("Zamorak page 1", listOf(1), false, false, true),
            Stock("Zamorak page 2", listOf(1), false, false, true),
            Stock("Zamorak page 3", listOf(1), false, false, true),
            Stock("Zamorak page 4", listOf(1), false, false, true),
            Stock("Guthix page 1", listOf(1), false, false, true),
            Stock("Guthix page 2", listOf(1), false, false, true),
            Stock("Guthix page 3", listOf(1), false, false, true),
            Stock("Guthix page 4", listOf(1), false, false, true),
            Stock("Mystic hat", listOf(1), false, false, true),
            Stock("Mystic robe top", listOf(1), false, false, true),
            Stock("Mystic robe bottom", listOf(1), false, false, true),
            Stock("Mystic gloves", listOf(1), false, false, true),
            Stock("Mystic boots", listOf(1), false, false, true),
            Stock("Mystic hat (dark)", listOf(1), false, false, true),
            Stock("Mystic robe top (dark)", listOf(1), false, false, true),
            Stock("Mystic robe bottom (dark)", listOf(1), false, false, true),
            Stock("Mystic gloves (dark)", listOf(1), false, false, true),
            Stock("Mystic boots (dark)", listOf(1), false, false, true),
            Stock("Mystic hat (light)", listOf(1), false, false, true),
            Stock("Mystic robe top (light)", listOf(1), false, false, true),
            Stock("Mystic robe bottom (light)", listOf(1), false, false, true),
            Stock("Mystic gloves (light)", listOf(1), false, false, true),
            Stock("Mystic boots (light)", listOf(1), false, false, true),
            Stock("Bronze boots", listOf(1), false, false, true),
            Stock("Iron boots", listOf(1), false, false, true),
            Stock("Steel boots", listOf(1), false, false, true),
            Stock("Black boots", listOf(1), false, false, true),
            Stock("Mithril boots", listOf(1), false, false, true),
            Stock("Adamant boots", listOf(1), false, false, true),
            Stock("Rune boots", listOf(1), false, true, true),
            Stock("Abyssal whip", listOf(1), false, true, true),
            Stock("Granite maul", listOf(1), false, true, true),
            Stock("Dragon scimitar", listOf(1), false, false, true),
            Stock("Ahrim's hood", listOf(1), false, false, true),
            Stock("Ahrim's staff", listOf(1), false, false, true),
            Stock("Ahrim's robetop", listOf(1), false, false, true),
            Stock("Ahrim's robeskirt", listOf(1), false, false, true),
            Stock("Dharok's helm", listOf(1), false, false, true),
            Stock("Dharok's greataxe", listOf(1), false, false, true),
            Stock("Dharok's platebody", listOf(1), false, false, true),
            Stock("Dharok's platelegs", listOf(1), false, false, true),
            Stock("Guthan's helm", listOf(1), false, false, true),
            Stock("Guthan's warspear", listOf(1), false, false, true),
            Stock("Guthan's platebody", listOf(1), false, false, true),
            Stock("Guthan's chainskirt", listOf(1), false, false, true),
            Stock("Karil's coif", listOf(1), false, false, true),
            Stock("Karil's crossbow", listOf(1), false, false, true),
            Stock("Karil's leathertop", listOf(1), false, false, true),
            Stock("Karil's leatherskirt", listOf(1), false, false, true),
            Stock("Bolt rack", listOf(100, 200, 500, 1000), false, true, true),
            Stock("Torag's helm", listOf(1), false, false, true),
            Stock("Torag's hammers", listOf(1), false, false, true),
            Stock("Torag's platebody", listOf(1), false, false, true),
            Stock("Torag's platelegs", listOf(1), false, false, true),
            Stock("Verac's helm", listOf(1), false, false, true),
            Stock("Verac's flail", listOf(1), false, false, true),
            Stock("Verac's brassard", listOf(1), false, false, true),
            Stock("Verac's plateskirt", listOf(1), false, false, true),
            Stock("Raw cave eel", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Cave eel", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Mining helmet", listOf(1), false, false, true),
            Stock("Bone spear", listOf(1), false, false, true),
            Stock("Bone club", listOf(1), false, false, true),
            Stock("Marigold seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Rosemary seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Nasturtium seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Woad seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Limpwurt seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Redberry seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Cadavaberry seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Dwellberry seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Jangerberry seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Whiteberry seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Poison ivy seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Cactus seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Belladonna seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Mushroom spore", listOf(1, 2, 5, 10), false, false, true),
            Stock("Apple tree seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Banana tree seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Orange tree seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Curry tree seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Pineapple seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Papaya tree seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Palm tree seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Calquat tree seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Guam seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Marrentill seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Tarromin seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Harralander seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Ranarr seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Toadflax seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Irit seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Avantoe seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Kwuarm seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Snapdragon seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Cadantine seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Lantadyme seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Dwarf weed seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Torstol seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Barley seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Jute seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Hammerstone seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Asgarnian seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Yanillian seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Krandorian seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Wildblood seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Acorn", listOf(1, 2, 5, 10), false, false, true),
            Stock("Willow seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Maple seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Yew seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Magic seed", listOf(1, 2, 5, 10), false, false, true),
            Stock("Potato seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Onion seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Sweetcorn seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Watermelon seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Tomato seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Strawberry seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Cabbage seed", listOf(10, 20, 50, 100), false, false, true),
            Stock("Gardening trowel", listOf(1), false, false, true),
            Stock("Secateurs", listOf(1), false, false, true),
            Stock("Watering can", listOf(1), false, false, true),
            Stock("Rake", listOf(1), false, false, true),
            Stock("Seed dibber", listOf(1), false, false, true),
            Stock("Empty plant pot", listOf(1, 2, 5, 10), false, false, true),
            Stock("Basket", listOf(10, 20, 50, 100), false, false, true),
            Stock("Empty sack", listOf(10, 20, 50, 100), false, false, true),
            Stock("Tiara", listOf(1), false, false, true),
            Stock("Air tiara", listOf(1), false, false, true),
            Stock("Mind tiara", listOf(1), false, false, true),
            Stock("Water tiara", listOf(1), false, false, true),
            Stock("Body tiara", listOf(1), false, false, true),
            Stock("Earth tiara", listOf(1), false, false, true),
            Stock("Fire tiara", listOf(1), false, false, true),
            Stock("Cosmic tiara", listOf(1), false, false, true),
            Stock("Nature tiara", listOf(1), false, false, true),
            Stock("Chaos tiara", listOf(1), false, false, true),
            Stock("Death tiara", listOf(1), false, false, true),
            Stock("Dragon dagger(p+)", listOf(1), false, true, true),
            Stock("Dragon dagger(p++)", listOf(1), false, true, true),
            Stock("Compost", listOf(10, 20, 50, 100), false, false, true),
            Stock("Plant cure", listOf(10, 20, 50, 100), false, false, true),
            Stock("Teak logs", listOf(100, 200, 500, 1000), false, false, true),
            Stock("Toktz-xil-ul", listOf(1), false, false, true),
            Stock("Toktz-xil-ak", listOf(1), false, false, true),
            Stock("Toktz-ket-xil", listOf(1), false, true, true),
            Stock("Toktz-xil-ek", listOf(1), false, false, true),
            Stock("Toktz-mej-tal", listOf(1), false, false, true),
            Stock("Tzhaar-ket-em", listOf(1), false, false, true),
            Stock("Tzhaar-ket-om", listOf(1), false, true, true),
            Stock("Obsidian cape", listOf(1), false, true, true),
            Stock("Amulet of fury", listOf(1), false, true, true),
            Stock("Onyx amulet", listOf(1), false, false, true),
            Stock("Granite legs", listOf(1), false, false, true),
            Stock("Mage's book", listOf(1), false, false, true),
            Stock("Beginner wand", listOf(1), false, false, true),
            Stock("Apprentice wand", listOf(1), false, false, true),
            Stock("Teacher wand", listOf(1), false, false, true),
            Stock("Master wand", listOf(1), false, false, true),
            Stock("Infinity top", listOf(1), false, false, true),
            Stock("Infinity hat", listOf(1), false, false, true),
            Stock("Infinity boots", listOf(1), false, false, true),
            Stock("Infinity gloves", listOf(1), false, false, true),
            Stock("Infinity bottoms", listOf(1), false, false, true),
            Stock("Blue skirt (g)", listOf(1), false, false, true),
            Stock("Blue wizard robe (g)", listOf(1), false, false, true),
            Stock("Blue wizard hat (g)", listOf(1), false, false, true),
            Stock("Pure essence", listOf(100, 200, 500, 1000, 2000), true, false, true),
            Stock("3rd Age range top", listOf(1), false, false, false),
            Stock("3rd Age range legs", listOf(1), false, false, false),
            Stock("3rd Age range coif", listOf(1), false, false, false),
            Stock("3rd Age vambraces", listOf(1), false, false, false),
            Stock("3rd Age robe top", listOf(1), false, false, false),
            Stock("3rd Age robe", listOf(1), false, false, false),
            Stock("3rd Age mage hat", listOf(1), false, false, false),
            Stock("3rd Age amulet", listOf(1), false, false, false),
            Stock("3rd Age platelegs", listOf(1), false, false, false),
            Stock("3rd Age platebody", listOf(1), false, false, false),
            Stock("3rd Age full helmet", listOf(1), false, false, false),
            Stock("3rd Age kiteshield", listOf(1), false, false, false),
            Stock("Zamorak bracers", listOf(1), false, false, false),
            Stock("Zamorak d'hide body", listOf(1), false, false, false),
            Stock("Zamorak chaps", listOf(1), false, false, false),
            Stock("Zamorak coif", listOf(1), false, false, false),
            Stock("Guthix bracers", listOf(1), false, false, false),
            Stock("Guthix d'hide body", listOf(1), false, false, false),
            Stock("Guthix chaps", listOf(1), false, false, false),
            Stock("Guthix coif", listOf(1), false, false, false),
            Stock("Saradomin bracers", listOf(1), false, false, false),
            Stock("Saradomin d'hide body", listOf(1), false, false, false),
            Stock("Saradomin chaps", listOf(1), false, false, false),
            Stock("Saradomin coif", listOf(1), false, false, false),
            Stock("Saradomin crozier", listOf(1), false, false, false),
            Stock("Guthix crozier", listOf(1), false, false, false),
            Stock("Zamorak crozier", listOf(1), false, false, false),
            Stock("Saradomin cloak", listOf(1), false, false, false),
            Stock("Guthix cloak", listOf(1), false, false, false),
            Stock("Zamorak cloak", listOf(1), false, false, false),
            Stock("Saradomin mitre", listOf(1), false, false, false),
            Stock("Guthix mitre", listOf(1), false, false, false),
            Stock("Zamorak mitre", listOf(1), false, false, false),
            Stock("Saradomin robe top", listOf(1), false, false, false),
            Stock("Zamorak robe top", listOf(1), false, false, false),
            Stock("Guthix robe top", listOf(1), false, false, false),
            Stock("Saradomin robe legs", listOf(1), false, false, false),
            Stock("Guthix robe legs", listOf(1), false, false, false),
            Stock("Zamorak robe legs", listOf(1), false, false, false),
            Stock("Saradomin stole", listOf(1), false, false, false),
            Stock("Guthix stole", listOf(1), false, false, false),
            Stock("Zamorak stole", listOf(1), false, false, false),
            Stock("Berserker necklace", listOf(1), false, false, false),
            Stock("Dark bow", listOf(1), false, false, false),
            Stock("Dragonfire shield", listOf(1), false, false, false),
            Stock("Draconic visage", listOf(1), false, false, false),
            Stock("Dragon full helm", listOf(1), false, false, false),
            Stock("Godsword blade", listOf(1), false, false, false),
            Stock("Armadyl godsword", listOf(1), false, false, false),
            Stock("Bandos godsword", listOf(1), false, false, false),
            Stock("Saradomin godsword", listOf(1), false, false, false),
            Stock("Zamorak godsword", listOf(1), false, false, false),
            Stock("Armadyl hilt", listOf(1), false, false, false),
            Stock("Bandos hilt", listOf(1), false, false, false),
            Stock("Saradomin hilt", listOf(1), false, false, false),
            Stock("Zamorak hilt", listOf(1), false, false, false),
            Stock("Godsword shard 1", listOf(1), false, false, false),
            Stock("Godsword shard 2", listOf(1), false, false, false),
            Stock("Godsword shard 3", listOf(1), false, false, false),
            Stock("Zamorakian spear", listOf(1), false, false, false),
            Stock("Armadyl helmet", listOf(1), false, false, false),
            Stock("Armadyl chestplate", listOf(1), false, false, false),
            Stock("Armadyl chainskirt", listOf(1), false, false, false),
            Stock("Bandos chestplate", listOf(1), false, false, false),
            Stock("Bandos tassets", listOf(1), false, false, false),
            Stock("Bandos boots", listOf(1), false, false, false),
            Stock("Saradomin sword", listOf(1), false, false, false),
            Stock("Dragon boots", listOf(1), false, false, false),
            Stock("Steam battlestaff", listOf(1), false, false, false),
            Stock("Mystic steam staff", listOf(1), false, false, false),
        )
    }
}
