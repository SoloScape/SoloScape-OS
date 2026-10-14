package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.util.Wearpos
import org.rsmod.api.inv.storage.PlayerItemStorage
import org.rsmod.api.invtx.InvTransactionsScript
import org.rsmod.api.invtx.invTakeFee
import org.rsmod.api.player.hook.PlayerRestrictions
import org.rsmod.api.player.interact.LocInteractions
import org.rsmod.api.route.BoundValidator
import org.rsmod.api.player.worn.HeldEquipOp
import org.rsmod.api.player.worn.WornUnequipOp
import org.rsmod.api.table.mining.MiningRocksRow
import org.rsmod.events.EventBus
import org.rsmod.game.cheat.CheatCommandMap
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.loc.LocEntity
import org.rsmod.game.loc.LocInfo
import org.rsmod.map.CoordGrid
import org.rsmod.routefinder.collision.CollisionFlagMap
import org.rsmod.game.queue.EngineQueueCache
import org.rsmod.game.type.getInvObj
import org.rsmod.plugin.scripts.ScriptContext

object BotSkillingCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        ServerCacheManager.init(240).close()
        val events = EventBus()
        with(InvTransactionsScript(PlayerItemStorage(emptySet()))) {
            ScriptContext(events, CheatCommandMap(), EngineQueueCache()).startup()
        }
        val supplies = BotSupplies(HeldEquipOp(events, PlayerRestrictions(emptySet())),
            WornUnequipOp(events))
        for (name in listOf("Oak tree", "Willow tree", "Yew tree", "Magic tree")) {
            val types = ServerCacheManager.getObjects().values.filter {
                it.name.equals(name, true) && it.actions.getOpOrNull(0).equals("Chop down", true)
            }
            check(types.isNotEmpty()) { "Missing cache-backed $name fixture" }
            check(types.all { supplies.sharedTree(BotTaskKind.Woodcutting, it.name) })
            check(!supplies.sharedTree(BotTaskKind.Mining, name))
        }
        check(!supplies.sharedTree(BotTaskKind.Woodcutting, "Tree"))
        check(!supplies.sharedTree(BotTaskKind.Woodcutting, "Tree stump"))
        for (task in SourceBotCatalog.tasks.filter { it.kind == BotTaskKind.Woodcutting }) {
            check(ServerCacheManager.getObjects().values.any {
                BotActions.named(it.name, supplies.gatheringNames(task)) &&
                    it.actions.getOpOrNull(0).equals(task.option, true)
            }) { "${task.id} cannot match a choppable tree in the installed cache" }
        }
        val woodcutting = SourceBotCatalog.tasks.single { it.id == "DraynorOakWoodcutting" }
        val mining = SourceBotCatalog.tasks.first { it.kind == BotTaskKind.Mining }
        val fishing = SourceBotCatalog.tasks.single { it.id == "DraynorNetFishing" }
        data class Case(val skill: Int, val attack: Int, val members: Int, val expected: String)
        for ((skill, attack, members, expected) in listOf(
            Case(1, 1, 0, "Iron"), Case(6, 5, 0, "Steel"),
            Case(11, 10, 0, "Black"), Case(21, 20, 0, "Mithril"),
            Case(31, 30, 0, "Adamant"), Case(41, 40, 0, "Rune"),
            Case(61, 60, 1, "Dragon"), Case(99, 99, 0, "Rune"),
            Case(99, 20, 1, "Mithril"),
        )) {
            val levels = mapOf("woodcutting" to skill, "mining" to skill,
                "attack" to attack, "members" to members)
            check(supplies.requirements(woodcutting, levels).keys.filter { it != "Coins" }
                .single() == "$expected axe")
            check(supplies.requirements(mining, levels).keys.filter { it != "Coins" }
                .single() == "$expected pickaxe")
        }
        check(supplies.requirements(fishing, emptyMap()).size == 2)
        check(supplies.requirements(fishing, emptyMap())["Coins"] == 100)
        val spots = ServerCacheManager.getNpcs().values
        check(spots.any { it.actions.getOpOrNull(0).equals("Small Net", true) })
        for (task in SourceBotCatalog.tasks.filter { it.kind == BotTaskKind.Fishing }) {
            check(spots.filter { BotActions.named(it.name, supplies.gatheringNames(task)) }
                .any { npc -> (0..4).any {
                BotActions.matchesOption(npc.actions.getOpOrNull(it), task.option)
            } }) { "${task.id} has no matching fishing option in the installed cache" }
        }
        val crossing = checkNotNull(BotRoutes.traversal(
            org.rsmod.map.CoordGrid(3268, 3228, 0), org.rsmod.map.CoordGrid(3267, 3228, 0)))
        for (target in crossing.targets) {
            val gate = checkNotNull(ServerCacheManager.getObject(target.asRSCM()))
            val loc = BoundLocInfo(LocInfo(1, CoordGrid(3268, 3228, 0),
                LocEntity(gate.id, 0, 0)), gate)
            val interactions = LocInteractions(BoundValidator(CollisionFlagMap()), events)
            val visible = interactions.multiLoc(loc, gate, Player().vars)
                ?.let { ServerCacheManager.getObject(it.id) } ?: gate
            check((0..4).any { visible.actions.getOpOrNull(it).equals(crossing.option, true) }) {
                "$target visible gate does not offer ${crossing.option}"
            }
        }
        val lowLevel = Player().apply {
            statMap.setCurrentLevel("stat.mining", 1)
        }
        for (row in MiningRocksRow.all()) {
            for (rock in row.rockObject) {
                check(supplies.canGather(lowLevel, BotTaskKind.Mining, rock) == (row.level <= 1))
            }
        }
        for (task in listOf(woodcutting, mining, fishing)) {
            repeat(12) { identity ->
                val level = listOf(1, 30, 99)[identity % 3]
                val metal = listOf("Iron", "Mithril", "Dragon")[identity % 3]
                val player = Player().apply {
                    inv = invMap.getOrPut("inv.inv")
                    worn = invMap.getOrPut("inv.worn")
                    members = true
                    BotAppearance.assign(appearance, identity)
                    for (skill in BotSkills.all) {
                        statMap.setBaseLevel(skill, level.toByte())
                        statMap.setCurrentLevel(skill, level.toByte())
                    }
                    // Regression: an old progressive profile may already have a shield/sword.
                    worn[Wearpos.LeftHand.slot] = InvObj("obj.wooden_shield")
                    worn[Wearpos.RightHand.slot] = InvObj("obj.bronze_sword")
                    inv[0] = InvObj("obj.wooden_shield")
                    inv[1] = InvObj("obj.bronze_sword")
                }
                supplies.seed(player, task, progressive = identity % 2 == 0)
                val coins = player.inv.objs.filterNotNull()
                    .single { it.id == "obj.coins".asRSCM(RSCMType.OBJ) }
                check(coins.count >= 100)
                check(player.invTakeFee(10)) { "Bot travel coins must pay a native toll" }
                check(player.worn[Wearpos.LeftHand.slot] == null)
                check(player.worn[Wearpos.Torso.slot] != null) {
                    "${task.id} outfit missing torso: inv=${player.inv.objs.filterNotNull().map { getInvObj(it).name }} worn=${player.worn.objs.filterNotNull().map { getInvObj(it).name }}"
                }
                check(player.worn[Wearpos.Legs.slot] != null)
                val tool = player.worn[Wearpos.RightHand.slot]?.let(::getInvObj)?.name
                check(tool == when (task.kind) {
                    BotTaskKind.Woodcutting -> "$metal axe"
                    BotTaskKind.Mining -> "$metal pickaxe"
                    else -> null
                }) { "${task.id} wielded $tool" }
                check(supplies.canSupply(player, task))
                check(player.inv.objs.filterNotNull().none {
                    getInvObj(it).name.endsWith("shield", true)
                })
            }
        }
        println("Bot skilling checks passed: tool tiers, outfits, shared trees and all cache-backed woodcutting targets.")
    }
}
