package org.rsmod.content.other.bots

import kotlin.random.Random
import org.rsmod.game.entity.player.Appearance

internal object BotAppearance {
    fun assign(appearance: Appearance, identity: Int) {
        val random = Random(identity)
        val female = random.nextBoolean()
        appearance.bodyType = if (female) Appearance.BODY_TYPE_B else Appearance.BODY_TYPE_A
        appearance.pronoun = if (female) Appearance.PRONOUN_SHE else Appearance.PRONOUN_HE
        val styles = if (female) {
            listOf(45..55, -1..-1, 56..60, 61..66, 67..69, 70..78, 79..81)
        } else {
            listOf(0..9, 10..17, 18..25, 26..32, 33..35, 36..41, 42..44)
        }
        styles.forEachIndexed { slot, range ->
            appearance.setIdentKit(slot, range.random(random))
        }
        listOf(25, 29, 29, 6, 8).forEachIndexed { slot, size ->
            appearance.setColour(slot, random.nextInt(size))
        }
    }
}
