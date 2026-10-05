package org.rsmod.content.other.bots

import jakarta.inject.Inject
import org.rsmod.api.death.PlayerDeathContext
import org.rsmod.api.death.PlayerDeathDrops.Companion.DROP_DURATION_PVP
import org.rsmod.api.death.PlayerDeathDrops.Companion.PVP_REVEAL_DELAY
import org.rsmod.api.death.PlayerDeathHandling
import org.rsmod.api.death.PlayerDeathHook
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

internal class BotLootKeyDeathHook
@Inject
constructor(private val population: BotPopulation) : PlayerDeathHook {
    override val priority: Int
        get() = BOT_DEATH_PRIORITY

    override fun handleDeath(context: PlayerDeathContext): PlayerDeathHandling? {
        if (!eligible(context)) return null
        return PlayerDeathHandling(
            keepCount = 0,
            dropReceiver = context.killer,
            dropDuration = DROP_DURATION_PVP,
            revealDelay = PVP_REVEAL_DELAY,
            supplyPile = false,
            untradeableHandling = UntradeableHandling.DROP,
        )
    }

    private fun eligible(context: PlayerDeathContext): Boolean {
        val killer = context.killer ?: return false
        return context.wildernessLevel > 0 &&
            !context.inInstance &&
            population.isBot(context.player) &&
            !population.isBot(killer)
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
) : PlayerDeathItemHook {
    override fun beforeDrops(context: PlayerDeathContext, handling: PlayerDeathHandling) {
        val killer = context.killer ?: return
        if (context.wildernessLevel <= 0 || context.inInstance) return
        if (!population.isBot(context.player) || population.isBot(killer)) return

        val keyType = BotLootKeys.nextType(killer)
        if (keyType == null) {
            killer.mes("You are already carrying the maximum of ${BotLootKeys.MAX_KEYS} loot keys.")
            return
        }

        val victim = context.player
        val carried = victim.inv.filterNotNull { true } + victim.worn.filterNotNull { true }
        if (carried.isEmpty()) return

        val bundleId = store.create(carried)
        val key = InvObj(keyType, vars = bundleId)

        victim.inv.fillNulls()
        victim.worn.fillNulls()

        val added = killer.invAdd(killer.inv, key.id, key.count, key.vars)
        if (added.success) {
            killer.mes("The bot's loot has been stored in a loot key.")
            return
        }

        val groundKey = Obj.fromPvp(killer, victim, key)
        objRepo.add(groundKey, handling.dropDuration, handling.revealDelay)
        killer.mes("Your inventory is full, so the loot key has been dropped on the ground.")
    }
}
