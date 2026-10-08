package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import jakarta.inject.Inject
import org.rsmod.api.death.PlayerDeathContext
import org.rsmod.api.death.PlayerDeathDrops.Companion.DROP_DURATION_PVP
import org.rsmod.api.death.PlayerDeathHandling
import org.rsmod.api.death.PlayerDeathHook
import org.rsmod.api.death.PlayerDeathDrops
import org.rsmod.api.death.PlayerDeathItemHook
import org.rsmod.api.death.UntradeableHandling
import org.rsmod.api.invtx.invAdd
import org.rsmod.api.player.output.mes
import org.rsmod.api.repo.obj.ObjRepository
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.isType
import org.rsmod.game.obj.Obj

internal object BotLootKeys {
    const val MAX_KEYS: Int = 5

    val types: List<String> = List(MAX_KEYS) { "obj.wildy_loot_key$it" }

    val chests: Set<String> =
        setOf(
            "loc.wildy_hub_loot_chest_closed_shifted",
            "loc.wildy_hub_loot_chest_open_shifted",
            "loc.wildy_hub_loot_chest_multi_shifted",
            "loc.wildy_hub_loot_chest_closed",
            "loc.wildy_hub_loot_chest_open",
            "loc.wildy_hub_loot_chest_multi",
            "loc.wildy_hub_loot_chest_closed_small",
            "loc.wildy_hub_loot_chest_open_small",
            "loc.wildy_hub_loot_chest_multi_small",
        )

    fun count(player: Player): Int = types.sumOf(player.inv::physicalCount)

    fun typeForCount(count: Int): String? = types.getOrNull(count)

    fun nextType(player: Player): String? = typeForCount(count(player))

    fun isKey(obj: InvObj?): Boolean = obj != null && types.any { obj.isType(it) }
}

internal object BotPvpDeathPolicy {
    fun isLootKeyDeath(wildernessLevel: Int, inInstance: Boolean): Boolean =
        wildernessLevel > 0 && !inInstance
}

internal object BotPvpCrystalDeath {
    private const val CRYSTAL_ARMOUR_SEED_NAME = "Crystal armour seed"

    fun seedCount(itemName: String): Int = when (itemName.lowercase()) {
        "crystal helm" -> 1
        "crystal legs" -> 2
        "crystal body" -> 3
        else -> 0
    }

    fun convertLostArmour(lostUntradeable: List<InvObj>): List<InvObj> {
        val seeds = lostUntradeable.sumOf { item ->
            val type = ServerCacheManager.getItem(item.id) ?: return@sumOf 0
            seedCount(type.name) * item.count
        }
        if (seeds <= 0) return emptyList()

        val seed = ServerCacheManager.getItemTypes()
            .asSequence()
            .filter {
                it.tradeable && !it.isCert && !it.isPlaceholder &&
                    !it.isTransformation && !it.isDummyItem
            }
            .firstOrNull { it.name.equals(CRYSTAL_ARMOUR_SEED_NAME, ignoreCase = true) }
            ?: return emptyList()

        return listOf(InvObj(seed, seeds))
    }
}

internal class BotLootKeyDeathHook
@Inject
constructor(private val population: BotPopulation) : PlayerDeathHook {
    override val priority: Int
        get() = BOT_DEATH_PRIORITY

    override fun handleDeath(context: PlayerDeathContext): PlayerDeathHandling? {
        if (!population.isPvpBot(context.player)) return null

        // PvP bots are synthetic economic actors. Their equipment may only enter the economy
        // through the Wilderness loot-key path below. If one dies after respawning in Lumbridge,
        // while returning to its hotspot, in an instance, or anywhere else outside valid
        // Wilderness PvP, destroy the synthetic carried loadout instead of falling through to
        // normal player death handling and spilling it onto the ground.
        if (!BotPvpDeathPolicy.isLootKeyDeath(context.wildernessLevel, context.inInstance)) {
            return PlayerDeathHandling(
                keepCount = 0,
                dropReceiver = null,
                dropDuration = DROP_DURATION_PVP,
                revealDelay = DROP_DURATION_PVP + 1,
                supplyPile = false,
                untradeableHandling = UntradeableHandling.DESTROY,
                destroyAllCarried = true,
                spawnRemains = false,
            )
        }

        return PlayerDeathHandling(
            keepCount = PlayerDeathDrops.wildernessKeepCount(
                isSkulled = context.isSkulled,
                hasProtectItem = context.hasProtectItem,
            ),
            dropReceiver = null,
            dropDuration = DROP_DURATION_PVP,
            // Keep any fallback ground key private for its entire lifetime.
            revealDelay = DROP_DURATION_PVP + 1,
            supplyPile = false,
            untradeableHandling = UntradeableHandling.DESTROY,
            destroyLostCarried = true,
            spawnRemains = false,
        )
    }


    private companion object {
        private const val BOT_DEATH_PRIORITY = 50
    }
}

internal class BotLootKeyItemHook
@Inject
constructor(
    private val population: BotPopulation,
    private val store: BotLootKeyStore,
    private val objRepo: ObjRepository,
    private val deathDrops: PlayerDeathDrops,
) : PlayerDeathItemHook {
    override fun beforeDrops(context: PlayerDeathContext, handling: PlayerDeathHandling) {
        if (!BotPvpDeathPolicy.isLootKeyDeath(context.wildernessLevel, context.inInstance)) return
        if (!population.isPvpBot(context.player)) return

        // Bot-vs-bot (or environment) deaths never create economic loot. For a real player kill,
        // select the same items normal Wilderness death handling says are actually lost. Dangerous
        // PvP deaths revert lost crystal armour into armour seeds (helm=1, legs=2, body=3), while
        // the bot handling destroys the original lost objects after this hook.
        val killer = context.killer ?: return
        if (population.isBot(killer)) return

        val victim = context.player
        val result = deathDrops.selectDrops(victim, context, handling)
        val carried = result.lostTradeable + BotPvpCrystalDeath.convertLostArmour(result.lostUntradeable)
        if (carried.isEmpty()) return

        val keyType = BotLootKeys.nextType(killer)
        if (keyType == null) {
            killer.mes(
                "You are already carrying the maximum of ${BotLootKeys.MAX_KEYS} loot keys; " +
                    "the bot's loot was discarded."
            )
            return
        }

        val bundleId = store.create(carried)
        val key = InvObj(keyType, vars = bundleId)
        val added = killer.invAdd(killer.inv, key.id, key.count, key.vars)
        if (added.success) {
            killer.mes("The bot's loot has been stored in a Wilderness loot key.")
            return
        }

        val groundKey = Obj.fromPvp(killer, victim, key)
        if (objRepo.add(groundKey, handling.dropDuration, handling.revealDelay)) {
            store.bindGround(groundKey, bundleId)
            killer.mes(
                "Your inventory is full, so your Wilderness loot key has been dropped privately."
            )
            return
        }

        store.remove(bundleId)
        killer.mes("The Wilderness loot key could not be created, so the bot's loot was discarded.")
    }
}
