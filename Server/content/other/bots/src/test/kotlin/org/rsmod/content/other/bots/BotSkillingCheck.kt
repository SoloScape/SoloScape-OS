package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.util.Wearpos
import org.rsmod.api.inv.storage.PlayerItemStorage
import org.rsmod.api.invtx.InvTransactionsScript
import org.rsmod.api.player.hook.PlayerRestrictions
import org.rsmod.api.player.worn.HeldEquipOp
import org.rsmod.api.player.worn.WornUnequipOp
import org.rsmod.api.table.mining.MiningRocksRow
import org.rsmod.events.EventBus
import org.rsmod.game.cheat.CheatCommandMap
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
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
            check(supplies.requirements(woodcutting, levels).keys.single() == "$expected axe")
            check(supplies.requirements(mining, levels).keys.single() == "$expected pickaxe")
        }
        check(supplies.requirements(fishing, emptyMap()).size == 1)
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
        println("Bot skilling checks passed: tool tiers, single requirements, outfits and shield removal.")
    }
}
