package org.rsmod.content.other.bots

import kotlin.random.Random
import org.rsmod.map.CoordGrid

/** Lightweight deterministic checks that do not require an active game world. */
object BotHumanityCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val first = BotHumanity.personality(42)
        check(first == BotHumanity.personality(42))
        check((1..20).map(BotHumanity::personality).distinct().size == 20)
        check(BotHumanity.nextPauseCycles(first, Random(1)) >= 120)
        check(BotHumanity.pauseCycles(first, Random(2)) in 1..45)
        check(BotHumanity.sessionCycles(first, Random(3)) > 1200)
        val taskA = BotTaskDefinition("DraynorWillows", BotTaskKind.Woodcutting, 5,
            CoordGrid(3092, 3245, 0), emptyList(), emptySet(), "Chop", "woodcutting")
        val taskB = taskA.copy(id = "VarrockWillows")
        check(BotHumanity.chooseTask(emptyList(), emptyMap(), first, Random(1)) == null)
        check(BotHumanity.chooseTask(listOf(taskA), emptyMap(), first, Random(1)) == taskA)
        val output = (0..25).map {
            BotHumanity.chooseTask(listOf(taskA, taskB), emptyMap(), first, Random(it))
        }
        check(output.all { it == taskA || it == taskB })
        println("BotHumanityCheck OK")
    }
}
