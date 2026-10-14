package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.types.ItemServerType
import jakarta.inject.Inject
import org.rsmod.api.player.events.skilling.SkillingActionCompleteEvent
import org.rsmod.api.player.events.skilling.SkillingActionContext
import org.rsmod.api.player.events.skilling.SkillingProduct
import org.rsmod.api.player.events.skilling.SkillingProductSource
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.skilling.SkillingAwardResult
import org.rsmod.api.player.skilling.awardSkillingProduct
import org.rsmod.api.stats.xpmod.XpModifiers
import org.rsmod.api.table.FiremakingLogsRow
import org.rsmod.game.inv.InvObj
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.type.getInvObj

class WoodcuttingHarvest @Inject constructor(private val xpMods: XpModifiers) {
    private val firemakingXp by lazy {
        FiremakingLogsRow.all().associate { it.input.id to it.xp.toDouble() }
    }

    fun ProtectedAccess.harvest(
        tree: BoundLocInfo,
        logs: ItemServerType,
        baseXp: Double,
        axe: InvObj,
        count: Int = 1,
    ): Boolean {
        val name = getInvObj(axe).internalName
        val ration = WoodcuttingAxes.isFelling(name) && ForestryRations.available(player)
        val skipLog = ration && random.of(5) == 0
        val burnXp = firemakingXp[logs.id]
        val burn = name == "obj.infernal_axe" && WoodcuttingAxes.charges(axe) > 0 &&
            burnXp != null && random.of(3) == 0
        val xp = baseXp * xpMods.get(player, "stat.woodcutting") * if (ration) 1.1 else 1.0
        val source = SkillingProductSource.Woodcutting(tree, logs)

        if (skipLog || burn) {
            statAdvance("stat.woodcutting", xp)
            if (burn) {
                WoodcuttingAxes.consume(player, axe)
                statAdvance("stat.firemaking", burnXp!! / 2 * xpMods.get(player, "stat.firemaking"))
                spam("Your infernal axe burns the logs to ashes.")
            }
            if (ration) ForestryRations.consume(player)
            publish(
                SkillingActionCompleteEvent(
                    player,
                    SkillingActionContext.Product("stat.woodcutting", logs.internalName, 0, xp, source),
                )
            )
            return true
        }

        val product = SkillingProduct(
            player = player,
            skill = "stat.woodcutting",
            item = logs.internalName,
            count = count,
            experience = xp,
            source = source,
        )
        if (awardSkillingProduct(product) != SkillingAwardResult.Success) return false
        if (ration) ForestryRations.consume(player)
        if (name == "obj.crystal_axe" || name == "obj.crystal_axe_2h") {
            WoodcuttingAxes.consume(player, axe)
        }
        spam("You get some ${logs.name.lowercase()}.")
        return true
    }
}
