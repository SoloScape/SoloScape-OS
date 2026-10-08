package org.rsmod.content.skills.agility

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.rsmod.map.CoordGrid

class AgilityPyramidHazardDataTest {
    @Test
    fun `all five rolling stone footprints are present`() {
        assertEquals(5, AgilityPyramidHazardData.stoneTraps.size)
        assertTrue(AgilityPyramidHazardData.stoneTraps.all { it.tiles.size == 4 })
        assertEquals(
            (1..5).map { "varbit.agility_pyramid_tilt_$it" },
            AgilityPyramidHazardData.stoneTraps.map { it.tiltVarbit },
        )
        assertTrue(
            AgilityPyramidHazardData.stoneTrapAt(CoordGrid(3368, 2850, 2)) != null,
        )
        assertTrue(
            AgilityPyramidHazardData.stoneTrapAt(CoordGrid(3045, 4700, 3)) != null,
        )

        val reported =
            listOf(
                requireNotNull(AgilityPyramidHazardData.stoneTrapAt(CoordGrid(3355, 2841, 1))),
                requireNotNull(AgilityPyramidHazardData.stoneTrapAt(CoordGrid(3374, 2835, 1))),
                requireNotNull(AgilityPyramidHazardData.stoneTrapAt(CoordGrid(3368, 2849, 2))),
            )
        assertEquals(listOf(-1, 1, 0), reported.map { it.safeDx })
        assertEquals(listOf(0, 0, 1), reported.map { it.safeDz })
    }

    @Test
    fun `rolling stone chance scales from level 30 to no fail at 70`() {
        assertEquals(75.0, AgilityPyramidHazardData.stoneSuccessChance(30))
        assertEquals(87.5, AgilityPyramidHazardData.stoneSuccessChance(50))
        assertEquals(100.0, AgilityPyramidHazardData.stoneSuccessChance(70))
        assertEquals(100.0, AgilityPyramidHazardData.stoneSuccessChance(99))
    }

    @Test
    fun `east block uses current cache anchor and extends two tiles east`() {
        val block =
            AgilityPyramidHazardData.movingBlocks.single {
                it.axis == PyramidBlockAxis.East
            }
        assertEquals(CoordGrid(3372, 2847, 1), block.spawn)
        assertEquals(CoordGrid(3374, 2847, 1), block.extended)
        assertEquals(
            setOf(
                CoordGrid(3374, 2847, 1),
                CoordGrid(3374, 2848, 1),
                CoordGrid(3375, 2847, 1),
                CoordGrid(3375, 2848, 1),
            ),
            block.extendedTiles,
        )
        assertEquals(
            setOf(
                CoordGrid(3373, 2847, 1),
                CoordGrid(3373, 2848, 1),
                CoordGrid(3374, 2847, 1),
                CoordGrid(3374, 2848, 1),
            ),
            block.occupiedTiles(CoordGrid(3373, 2847, 1)),
        )
        assertEquals(
            CoordGrid(3376, 2848, 1),
            block.pushDestination(CoordGrid(3375, 2848, 1)),
        )
    }

    @Test
    fun `north block uses current cache anchor and extends two tiles north`() {
        val block =
            AgilityPyramidHazardData.movingBlocks.single {
                it.axis == PyramidBlockAxis.North
            }
        assertEquals(CoordGrid(3366, 2845, 3), block.spawn)
        assertEquals(CoordGrid(3366, 2847, 3), block.extended)
        assertEquals(
            CoordGrid(3367, 2849, 3),
            block.pushDestination(CoordGrid(3367, 2848, 3)),
        )
    }
}
