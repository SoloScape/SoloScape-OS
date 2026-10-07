package org.rsmod.content.skills.agility

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.rsmod.map.CoordGrid

class AgilityPyramidObstacleDataTest {
    @Test
    fun `layout includes every static obstacle occurrence`() {
        val counts = AgilityPyramidObstacleData.routes.groupingBy { it.kind }.eachCount()
        assertEquals(5, counts[PyramidObstacleKind.LowWall])
        assertEquals(4, counts[PyramidObstacleKind.Ledge])
        assertEquals(2, counts[PyramidObstacleKind.Plank])
        assertEquals(3, counts[PyramidObstacleKind.CrossGap])
        assertEquals(6, counts[PyramidObstacleKind.JumpGap])
    }

    @Test
    fun `jump routes preserve the player's lane`() {
        val clicked = CoordGrid(3357, 2847, 2)
        val route = requireNotNull(AgilityPyramidObstacleData.route(PyramidObstacleKind.JumpGap, clicked))
        assertEquals(
            CoordGrid(3357, 2849, 2),
            AgilityPyramidObstacleData.destination(route, CoordGrid(3357, 2846, 2)),
        )
        assertEquals(
            CoordGrid(3356, 2846, 2),
            AgilityPyramidObstacleData.destination(route, CoordGrid(3356, 2849, 2)),
        )
    }

    @Test
    fun `upper pyramid failures return to the visible pyramid layer below`() {
        assertEquals(
            CoordGrid(3360, 2841, 3),
            AgilityPyramidObstacleData.dropOneLayer(CoordGrid(3040, 4697, 2)),
        )
        assertEquals(
            CoordGrid(3046, 4697, 2),
            AgilityPyramidObstacleData.dropOneLayer(CoordGrid(3046, 4697, 3)),
        )
    }

    @Test
    fun `stairs enter and leave the separate upper pyramid map`() {
        assertEquals(
            CoordGrid(3040, 4695, 2),
            AgilityPyramidObstacleData.stairDestination(CoordGrid(3360, 2837, 3), up = true),
        )
        assertEquals(
            CoordGrid(3360, 2836, 3),
            AgilityPyramidObstacleData.stairDestination(CoordGrid(3040, 4693, 2), up = false),
        )
    }
}
