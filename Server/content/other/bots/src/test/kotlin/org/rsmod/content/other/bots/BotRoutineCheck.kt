package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import java.nio.file.Files
import kotlin.random.Random
import org.rsmod.api.inv.storage.PlayerItemStorage
import org.rsmod.api.invtx.InvTransactionsScript
import org.rsmod.api.player.hook.PlayerRestrictions
import org.rsmod.api.player.worn.HeldEquipOp
import org.rsmod.api.player.worn.WornUnequipOp
import org.rsmod.events.EventBus
import org.rsmod.game.cheat.CheatCommandMap
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.queue.EngineQueueCache
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.ScriptContext

/** Cache-backed planning regressions; no running server, players or networking needed. */
object BotRoutineCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val tasks = SourceBotCatalog.tasks
        val wood = tasks.first { it.kind == BotTaskKind.Woodcutting }
        val goal = BotTrainingGoal("woodcutting", 60)
        check(BotTrainingGoal.parse(goal.toString()) == goal)
        for (bad in listOf(null, "", "woodcutting:100", "woodcutting:1", "unknown:60", "cooking:x")) {
            check(BotTrainingGoal.parse(bad) == null)
        }
        check(BotRoutinePlanner.goal(goal, BotTaskKind.Fishing, listOf(wood),
            mapOf("woodcutting" to 59)) == goal)
        val advanced = BotRoutinePlanner.goal(goal, BotTaskKind.Woodcutting, listOf(wood),
            mapOf("woodcutting" to 60))!!
        check(advanced.skill == "woodcutting" && advanced.level == 75)
        check(BotRoutinePlanner.goal(goal, BotTaskKind.Woodcutting, listOf(wood),
            mapOf("woodcutting" to 99)) == null)
        val local = wood.copy(id = "local", start = CoordGrid(3200, 3200), route = emptyList())
        val distant = local.copy(id = "distant", start = CoordGrid(3000, 3000))
        val position = local.start
        check(BotRoutinePlanner.weight(local, position, goal) >
            BotRoutinePlanner.weight(distant, position, goal))
        check(BotRoutinePlanner.weight(local, position, goal) >
            BotRoutinePlanner.weight(local, position, null))
        check(BotRoutinePlanner.weight(local.copy(route = listOf(distant.start)), position, goal) <
            BotRoutinePlanner.weight(local, position, goal))
        val personality = BotHumanity.personality(42)
        val biases = listOf(local, distant).associate { it.id to BotRoutinePlanner.weight(it, position, goal) }
        val random = Random(21)
        val nearby = (1..4000).count { BotHumanity.chooseTask(listOf(local, distant), emptyMap(),
            personality, random, taskBias = biases) == local }
        check(nearby > 2600) { "Travel preference too weak: $nearby" }
        check((1..1000).map { BotHumanity.personality(it).focus }.toSet() == BotRoutinePlanner.expandedKinds)
        check(BotRoutinePlanner.followOn(BotTaskKind.Shearing, BotTaskKind.Spinning))
        check(!BotRoutinePlanner.followOn(BotTaskKind.Fishing, BotTaskKind.Smithing))

        ServerCacheManager.init(240).close()
        val events = EventBus()
        with(InvTransactionsScript(PlayerItemStorage(emptySet()))) {
            ScriptContext(events, CheatCommandMap(), EngineQueueCache()).startup()
        }
        val supplies = BotSupplies(HeldEquipOp(events, PlayerRestrictions(emptySet())), WornUnequipOp(events))
        val player = Player().apply {
            username = "worldbot_routine_test"
            appearance.combatLevel = 50
            inv = invMap.getOrPut("inv.inv")
            worn = invMap.getOrPut("inv.worn")
            for (skill in BotSkills.all) {
                statMap.setBaseLevel(skill, 50)
                statMap.setCurrentLevel(skill, 50)
            }
        }
        fun item(name: String, count: Int = 1): InvObj {
            val type = ServerCacheManager.getItemTypes().first {
                it.name.equals(name, true) && it.certtemplate == 0
            }
            return InvObj(type.internalName, count)
        }
        val bank = player.invMap.getOrPut("inv.bank")
        val cook = tasks.first { it.kind == BotTaskKind.Cooking }
        val fish = tasks.first { it.kind == BotTaskKind.Fishing }
        bank[0] = item("Raw shrimps", 100)
        bank[1] = item("Raw trout", 5)
        player.inv[0] = item("Raw trout")
        supplies.rememberGathered(player, fish)
        player.inv[0] = null
        // Recently caught trout beats seeded shrimp stock and needs no coins.
        check(supplies.requirements(player, cook).keys == setOf("Raw trout"))
        check(supplies.canSupply(player, cook))
        check(!supplies.hasWorkingSupplies(player, cook))
        player.inv[0] = item("Raw trout")
        check(supplies.hasWorkingSupplies(player, cook))
        check(supplies.routineWeight(player, fish, cook) > supplies.routineWeight(player, wood, cook))
        player.statMap.setBaseLevel("stat.cooking", 1)
        check(supplies.requirements(player, cook).keys == setOf("Raw shrimps"))
        player.statMap.setBaseLevel("stat.cooking", 50)
        val smelt = tasks.first { it.kind == BotTaskKind.Smelting }
        bank[2] = item("Iron ore", 2)
        bank[3] = item("Coal", 1)
        check(!supplies.canSupply(player, smelt))
        bank[3] = item("Coal", 2)
        check(supplies.canSupply(player, smelt))
        check(!supplies.hasWorkingSupplies(player, smelt))
        check(supplies.recipe(smelt) == "Steel bar")
        check(!BotTaskPlanner.available(smelt, mapOf("smithing" to 29), false))
        check(BotTaskPlanner.available(smelt, mapOf("smithing" to 30), false))
        bank[4] = item("Steel bar", 2)
        bank[5] = item("Hammer")
        val smith = tasks.first { it.kind == BotTaskKind.Smithing }
        check(supplies.canSupply(player, smith))
        check(supplies.routineWeight(player, smelt, smith) > 1.0)
        // Exhausted production must leave supplied gathering candidates available.
        bank[2] = null
        check(!supplies.canSupply(player, smelt))
        bank[6] = item("Small fishing net")
        val net = tasks.first { it.id == "DraynorNetFishing" }
        player.statMap.setBaseLevel("stat.fishing", 1)
        player.statMap.setBaseLevel("stat.cooking", 1)
        check(supplies.canSupply(player, net))
        check(BotTaskPlanner.select(listOf(smelt, net).filter { supplies.canSupply(player, it) },
            BotSkills.levels(player), false, emptyMap(), Random(1)) == net)
        bank[7] = item("Bronze pickaxe")
        val mine = tasks.first { it.kind == BotTaskKind.Mining }
        check(supplies.requirements(player, mine).keys == setOf("Bronze pickaxe"))
        check(supplies.canSupply(player, mine)) // losing a higher tool need not strand the miner

        val directory = Files.createTempDirectory("bot-goal-check-")
        try {
            val store = BotProfileStore(directory)
            store.save(player, cook.id, goal)
            check(store.loadGoal(player) == goal)
            check(store.load(player) == cook.id)
            check(store.loadGoal(player) == goal)
            store.save(player, cook.id)
            check(store.loadGoal(player) == null) // old profiles need no migration
        } finally {
            Files.deleteIfExists(directory.resolve("${player.username}.properties"))
            Files.delete(directory)
        }
        println("BotRoutineCheck OK: goals, travel, specializations, actual catch, material batches and supply detours")
    }
}
