package org.rsmod.content.skills.fletching

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class FletchingTimingTest {
    private fun recipe(tool: FletchingTool?, output: String = "obj.arrow_shaft", ticks: Int = 3) =
        FletchingRecipe(output = output, inputs = emptyList(), level = 1, xp = 1.0,
            ticks = ticks, tool = tool, message = "")

    @Test
    fun `knife speeds cutting only when owned`() {
        assertEquals(2, fletchingCycleTicks(recipe(KNIFE), true))
        assertEquals(3, fletchingCycleTicks(recipe(KNIFE), false))
        assertEquals(3, fletchingCycleTicks(recipe(CHISEL), true))
        assertEquals(3, fletchingCycleTicks(recipe(null), true))
    }

    @Test
    fun `excluded products and short cycles retain their timing`() {
        assertEquals(3, fletchingCycleTicks(recipe(KNIFE, "obj.blisterwood_sickle"), true))
        assertEquals(1, fletchingCycleTicks(recipe(KNIFE, ticks = 1), true))
        assertEquals(0, fletchingCycleTicks(recipe(KNIFE, ticks = 0), true))
    }
}
