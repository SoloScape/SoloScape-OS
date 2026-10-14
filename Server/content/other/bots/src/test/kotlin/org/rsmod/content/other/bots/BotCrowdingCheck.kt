package org.rsmod.content.other.bots

import kotlin.random.Random
import org.rsmod.game.entity.player.Appearance

object BotCrowdingCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val appearances = (1..300).map { identity ->
            val appearance = Appearance()
            BotAppearance.assign(appearance, identity)
            check(appearance.coloursSnapshot().map { it.toInt() }.zip(listOf(25, 29, 29, 6, 8))
                .all { (colour, size) -> colour in 0 until size })
            if (appearance.bodyType == Appearance.BODY_TYPE_B) {
                check(appearance.identKitSnapshot()[1].toInt() == Appearance.NO_IDENT_KIT)
            }
            Triple(appearance.bodyType, appearance.identKitSnapshot(), appearance.coloursSnapshot())
        }
        check(appearances.toSet().size == 300)
        val repeat = Appearance()
        BotAppearance.assign(repeat, 1)
        check(repeat.identKitSnapshot() == appearances.first().second)
        check(repeat.coloursSnapshot() == appearances.first().third)

        val tasks = SourceBotCatalog.tasks.filter {
            it.kind in setOf(BotTaskKind.Mining, BotTaskKind.Fishing, BotTaskKind.Woodcutting)
        }
        val counts = mutableMapOf<String, Int>()
        val random = Random(12)
        repeat(300) {
            val task = checkNotNull(BotTaskPlanner.selectBalanced(tasks, counts, random))
            counts[task.id] = (counts[task.id] ?: 0) + 1
        }
        check(counts.size == tasks.size)
        check(counts.values.max() - counts.values.min() <= 1)
        check(BotTaskPlanner.selectBalanced(emptyList(), counts, random) == null)

        val reservations = BotReservations<Any, Pair<Int, Int>>()
        val first = Any()
        val second = Any()
        check(reservations.claim(first, 3200 to 3200))
        check(!reservations.claim(second, 3200 to 3200))
        check(reservations.claim(first, 3200 to 3200))
        check(reservations.claim(second, 3201 to 3200))
        reservations.release(first)
        check(reservations.claim(second, 3200 to 3200))
        check(reservations.claim(first, 3201 to 3200))
        println("Bot crowding checks passed: 300 varied appearances, balanced tasks and resource ownership.")
    }
}
