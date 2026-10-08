package org.rsmod.content.skills.agility

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class AgilityPyramidRewardsTest {
    @Test
    fun `completion xp scales from base agility and caps at one thousand`() {
        assertEquals(540.0, AgilityPyramidRewards.completionXp(30))
        assertEquals(996.0, AgilityPyramidRewards.completionXp(87))
        assertEquals(1000.0, AgilityPyramidRewards.completionXp(88))
        assertEquals(1000.0, AgilityPyramidRewards.completionXp(99))
    }

    @Test
    fun `pyramid tops are worth ten thousand coins each`() {
        assertEquals(10_000, AgilityPyramidRewards.coinsForTops(1))
        assertEquals(30_000, AgilityPyramidRewards.coinsForTops(3))
    }
}
