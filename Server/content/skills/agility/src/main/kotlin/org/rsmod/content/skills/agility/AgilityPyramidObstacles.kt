package org.rsmod.content.skills.agility

import dev.openrune.ServerCacheManager
import jakarta.inject.Inject
import kotlin.math.abs
import org.rsmod.api.config.constants
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.stat.agilityLvl
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpLoc2
import org.rsmod.api.script.onOpLoc3
import org.rsmod.api.script.onOpLoc4
import org.rsmod.api.script.onOpLoc5
import org.rsmod.api.stats.xpmod.XpModifiers
import org.rsmod.game.hit.HitType
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext
import skillSuccess

internal enum class PyramidObstacleKind {
    LowWall,
    Ledge,
    Plank,
    CrossGap,
    JumpGap,
}

internal data class PyramidRoute(
    val kind: PyramidObstacleKind,
    val first: List<CoordGrid>,
    val second: List<CoordGrid>,
)

internal data class PyramidObstacleConfig(
    val xp: Double,
    val low: Int,
    val high: Int,
    val damage: Int,
    val dropsOnFail: Boolean,
)

internal object AgilityPyramidObstacleData {
    val routes =
        listOf(
            route(PyramidObstacleKind.LowWall, point(3355, 2848, 1), point(3355, 2850, 1)),
            route(PyramidObstacleKind.LowWall, point(3369, 2834, 2), point(3371, 2834, 2)),
            route(PyramidObstacleKind.LowWall, point(3359, 2838, 3), point(3359, 2840, 3)),
            route(PyramidObstacleKind.LowWall, point(3041, 4702, 2), point(3043, 4702, 2)),
            route(PyramidObstacleKind.LowWall, point(3046, 4694, 2), point(3048, 4694, 2)),
            route(PyramidObstacleKind.Ledge, point(3368, 2851, 1), point(3363, 2851, 1)),
            route(PyramidObstacleKind.Ledge, point(3364, 2832, 1), point(3359, 2832, 1)),
            route(PyramidObstacleKind.Ledge, point(3372, 2841, 2), point(3372, 2836, 2)),
            route(PyramidObstacleKind.Ledge, point(3359, 2842, 3), point(3359, 2847, 3)),
            route(PyramidObstacleKind.Plank, point(3375, 2847, 1), point(3375, 2839, 1)),
            route(PyramidObstacleKind.Plank, point(3372, 2835, 3), point(3364, 2835, 3)),
            route(PyramidObstacleKind.CrossGap, point(3367, 2832, 1), point(3372, 2832, 1)),
            route(PyramidObstacleKind.CrossGap, point(3357, 2836, 2), point(3357, 2841, 2)),
            route(PyramidObstacleKind.CrossGap, point(3359, 2849, 2), point(3364, 2849, 2)),
            laneRoute(
                PyramidObstacleKind.JumpGap,
                listOf(point(3356, 2846, 2), point(3357, 2846, 2)),
                listOf(point(3356, 2849, 2), point(3357, 2849, 2)),
            ),
            laneRoute(
                PyramidObstacleKind.JumpGap,
                listOf(point(3363, 2833, 2), point(3363, 2834, 2)),
                listOf(point(3366, 2833, 2), point(3366, 2834, 2)),
            ),
            laneRoute(
                PyramidObstacleKind.JumpGap,
                listOf(point(3370, 2840, 3), point(3371, 2840, 3)),
                listOf(point(3370, 2843, 3), point(3371, 2843, 3)),
            ),
            laneRoute(
                PyramidObstacleKind.JumpGap,
                listOf(point(3040, 4696, 2), point(3041, 4696, 2)),
                listOf(point(3040, 4699, 2), point(3041, 4699, 2)),
            ),
            laneRoute(
                PyramidObstacleKind.JumpGap,
                listOf(point(3048, 4694, 2), point(3049, 4694, 2)),
                listOf(point(3048, 4697, 2), point(3049, 4697, 2)),
            ),
            laneRoute(
                PyramidObstacleKind.JumpGap,
                listOf(point(3046, 4696, 3), point(3047, 4696, 3)),
                listOf(point(3046, 4699, 3), point(3047, 4699, 3)),
            ),
        )

    private val configs =
        mapOf(
            PyramidObstacleKind.LowWall to PyramidObstacleConfig(8.0, 245, 255, 4, dropsOnFail = false),
            PyramidObstacleKind.Ledge to PyramidObstacleConfig(52.0, 181, 320, 10, dropsOnFail = true),
            PyramidObstacleKind.Plank to PyramidObstacleConfig(56.4, 166, 340, 10, dropsOnFail = true),
            PyramidObstacleKind.CrossGap to PyramidObstacleConfig(56.4, 180, 308, 8, dropsOnFail = true),
            PyramidObstacleKind.JumpGap to PyramidObstacleConfig(22.0, 185, 329, 8, dropsOnFail = true),
        )

    fun config(kind: PyramidObstacleKind): PyramidObstacleConfig = requireNotNull(configs[kind])

    fun route(kind: PyramidObstacleKind, clicked: CoordGrid): PyramidRoute? {
        val nearest =
            routes
                .asSequence()
                .filter { it.kind == kind && it.first.first().level == clicked.level }
                .minByOrNull { distanceToRoute(clicked, it) }
                ?: return null
        return nearest.takeIf { distanceToRoute(clicked, it) <= ROUTE_MATCH_DISTANCE }
    }

    fun destination(route: PyramidRoute, from: CoordGrid): CoordGrid? {
        val first = route.first.minByOrNull(from::chebyshevDistance) ?: return null
        val second = route.second.minByOrNull(from::chebyshevDistance) ?: return null
        val firstDistance = from.chebyshevDistance(first)
        val secondDistance = from.chebyshevDistance(second)
        val nearestDistance = minOf(firstDistance, secondDistance)
        if (nearestDistance > APPROACH_DISTANCE) {
            return null
        }
        val destinations = if (firstDistance <= secondDistance) route.second else route.first
        return destinations.minByOrNull(from::chebyshevDistance)
    }

    fun midpoint(from: CoordGrid, to: CoordGrid): CoordGrid =
        CoordGrid((from.x + to.x) / 2, (from.z + to.z) / 2, from.level)

    fun dropOneLayer(from: CoordGrid): CoordGrid {
        if (from.level == 2 && (from.x shr 6) == UPPER_REGION_X && (from.z shr 6) == UPPER_REGION_Z) {
            return CoordGrid(from.x + UPPER_X_OFFSET, from.z - UPPER_Z_OFFSET, 3)
        }
        return if (from.level > 0) CoordGrid(from.x, from.z, from.level - 1) else from
    }

    fun stairDestination(loc: CoordGrid, up: Boolean): CoordGrid? {
        if (up && loc.level == 3 && loc.x in 3358..3362 && loc.z in 2835..2839) {
            return CoordGrid(3040, 4695, 2)
        }
        if (!up && loc.level == 2 && loc.x in 3038..3042 && loc.z in 4692..4695) {
            return CoordGrid(3360, 2836, 3)
        }
        val level = loc.level + if (up) 1 else -1
        if (level !in 0 until CoordGrid.LEVEL_COUNT) {
            return null
        }
        return CoordGrid(loc.x, loc.z + if (up) 2 else -1, level)
    }

    private fun distanceToRoute(clicked: CoordGrid, route: PyramidRoute): Int =
        (route.first + route.second).minOf(clicked::chebyshevDistance)

    private fun route(kind: PyramidObstacleKind, first: CoordGrid, second: CoordGrid) =
        PyramidRoute(kind, listOf(first), listOf(second))

    private fun laneRoute(
        kind: PyramidObstacleKind,
        first: List<CoordGrid>,
        second: List<CoordGrid>,
    ) = PyramidRoute(kind, first, second)

    private fun point(x: Int, z: Int, level: Int) = CoordGrid(x, z, level)

    private const val ROUTE_MATCH_DISTANCE = 6
    private const val APPROACH_DISTANCE = 3
    private const val UPPER_REGION_X = 47
    private const val UPPER_REGION_Z = 73
    private const val UPPER_X_OFFSET = 320
    private const val UPPER_Z_OFFSET = 1856
}

class AgilityPyramidObstacles
@Inject
constructor(private val xpMods: XpModifiers) : PluginScript() {
    override fun ScriptContext.startup() {
        for ((kind, locs) in OBSTACLE_LOCS) {
            for (loc in locs) {
                registerObstacle(loc, kind)
            }
        }
        registerStairs(STEPS_UP, up = true)
        registerStairs(STEPS_DOWN, up = false)
    }

    private fun ScriptContext.registerObstacle(loc: String, kind: PyramidObstacleKind) {
        val type = ServerCacheManager.getObject(locId(loc) ?: return) ?: return
        val slot = (1..5).firstOrNull { !type.actions.getOpOrNull(it - 1).isNullOrBlank() } ?: return
        when (slot) {
            1 -> onOpLoc1(loc) { cross(it.loc, kind) }
            2 -> onOpLoc2(loc) { cross(it.loc, kind) }
            3 -> onOpLoc3(loc) { cross(it.loc, kind) }
            4 -> onOpLoc4(loc) { cross(it.loc, kind) }
            5 -> onOpLoc5(loc) { cross(it.loc, kind) }
        }
    }

    private fun ScriptContext.registerStairs(loc: String, up: Boolean) {
        val type = ServerCacheManager.getObject(locId(loc) ?: return) ?: return
        val slot = (1..5).firstOrNull { !type.actions.getOpOrNull(it - 1).isNullOrBlank() } ?: return
        when (slot) {
            1 -> onOpLoc1(loc) { climbStairs(it.loc, up) }
            2 -> onOpLoc2(loc) { climbStairs(it.loc, up) }
            3 -> onOpLoc3(loc) { climbStairs(it.loc, up) }
            4 -> onOpLoc4(loc) { climbStairs(it.loc, up) }
            5 -> onOpLoc5(loc) { climbStairs(it.loc, up) }
        }
    }

    private suspend fun ProtectedAccess.cross(loc: BoundLocInfo, kind: PyramidObstacleKind) {
        if (player.agilityLvl < REQUIRED_LEVEL) {
            mes("You need an Agility level of $REQUIRED_LEVEL to use the Agility Pyramid.")
            return
        }

        val route = AgilityPyramidObstacleData.route(kind, loc.coords)
        if (route == null) {
            mes("You can't use this obstacle from here.")
            return
        }
        val dest = AgilityPyramidObstacleData.destination(route, coords)
        if (dest == null) {
            mes("You need to get closer to the obstacle.")
            return
        }

        val config = AgilityPyramidObstacleData.config(kind)
        val failed =
            player.agilityLvl < NO_FAIL_LEVEL &&
                !skillSuccess(config.low, config.high, player.agilityLvl)
        if (failed) {
            fail(kind, dest, config)
            return
        }

        traverse(kind, dest)
        statAdvance(STAT_AGILITY, config.xp * xpMods.get(player, STAT_AGILITY))
    }

    private suspend fun ProtectedAccess.traverse(kind: PyramidObstacleKind, dest: CoordGrid) {
        val start = coords
        val ticks = start.chebyshevDistance(dest).coerceAtLeast(1)
        faceSquare(dest)
        anim(successSeq(kind, start, dest))
        exactMove(
            start,
            dest,
            0,
            ticks * CLIENT_CYCLES_PER_TICK,
            facing(start, dest),
            TeleportType.Exempt,
        )
        delay(ticks)
        if (coords != dest) {
            teleport(dest, TeleportType.Exempt)
        }
        resetAnim()
    }

    private suspend fun ProtectedAccess.fail(
        kind: PyramidObstacleKind,
        dest: CoordGrid,
        config: PyramidObstacleConfig,
    ) {
        val start = coords
        faceSquare(dest)
        anim(failSeq(kind, start, dest))

        if (!config.dropsOnFail) {
            delay(2)
            resetAnim()
            queueHit(delay = 0, type = HitType.Typeless, damage = config.damage)
            mes("You lose your balance and fail to cross the obstacle.")
            return
        }

        val fallFrom = AgilityPyramidObstacleData.midpoint(start, dest)
        if (fallFrom != start) {
            val ticks = start.chebyshevDistance(fallFrom).coerceAtLeast(1)
            exactMove(
                start,
                fallFrom,
                0,
                ticks * CLIENT_CYCLES_PER_TICK,
                facing(start, fallFrom),
                TeleportType.Exempt,
            )
            delay(ticks)
        } else {
            delay(1)
        }

        teleport(AgilityPyramidObstacleData.dropOneLayer(fallFrom), TeleportType.Exempt)
        resetAnim()
        queueHit(delay = 0, type = HitType.Typeless, damage = config.damage)
        mes("You slip and fall to the level below.")
    }

    private suspend fun ProtectedAccess.climbStairs(loc: BoundLocInfo, up: Boolean) {
        if (player.agilityLvl < REQUIRED_LEVEL) {
            mes("You need an Agility level of $REQUIRED_LEVEL to use the Agility Pyramid.")
            return
        }
        val dest = AgilityPyramidObstacleData.stairDestination(loc.coords, up)
        if (dest == null) {
            mes("You cannot see a way ${if (up) "up" else "down"} from here.")
            return
        }
        faceSquare(loc.coords)
        anim(if (up) STAIR_UP_SEQ else STAIR_DOWN_SEQ)
        delay(1)
        telejump(dest, TeleportType.Exempt)
        resetAnim()
    }

    private fun successSeq(kind: PyramidObstacleKind, from: CoordGrid, to: CoordGrid): String =
        when (kind) {
            PyramidObstacleKind.LowWall -> LOW_WALL_SEQ
            PyramidObstacleKind.Ledge ->
                if (positiveDirection(from, to)) LEDGE_RIGHT_SEQ else LEDGE_LEFT_SEQ
            PyramidObstacleKind.Plank -> PLANK_SEQ
            PyramidObstacleKind.CrossGap -> HANDHOLDS_SEQ
            PyramidObstacleKind.JumpGap -> JUMP_SEQ
        }

    private fun failSeq(kind: PyramidObstacleKind, from: CoordGrid, to: CoordGrid): String =
        when (kind) {
            PyramidObstacleKind.LowWall -> LOW_WALL_SEQ
            PyramidObstacleKind.Ledge ->
                if (positiveDirection(from, to)) LEDGE_FALL_RIGHT_SEQ else LEDGE_FALL_LEFT_SEQ
            PyramidObstacleKind.Plank -> PLANK_STUMBLE_SEQ
            PyramidObstacleKind.CrossGap -> HANDHOLDS_FALL_SEQ
            PyramidObstacleKind.JumpGap -> JUMP_FALL_SEQ
        }

    private fun positiveDirection(from: CoordGrid, to: CoordGrid): Boolean =
        to.x > from.x || (to.x == from.x && to.z > from.z)

    private companion object {
        const val REQUIRED_LEVEL = 30
        const val NO_FAIL_LEVEL = 75
        const val CLIENT_CYCLES_PER_TICK = 30
        const val STAT_AGILITY = "stat.agility"

        const val LOW_WALL_SEQ = "seq.human_lowwall"
        const val LEDGE_LEFT_SEQ = "seq.agility_pyramid_ledge_walk_left"
        const val LEDGE_RIGHT_SEQ = "seq.agility_pyramid_ledge_walk_right"
        const val LEDGE_FALL_LEFT_SEQ = "seq.agility_pyramid_ledge_fall_left"
        const val LEDGE_FALL_RIGHT_SEQ = "seq.agility_pyramid_ledge_fall_right"
        const val PLANK_SEQ = "seq.human_walk_logbalance_loop"
        const val PLANK_STUMBLE_SEQ = "seq.human_walk_logbalance_stumble"
        const val HANDHOLDS_SEQ = "seq.agilityarena_handholds_middle"
        const val HANDHOLDS_FALL_SEQ = "seq.agilityarena_handholds_middlefall"
        const val JUMP_SEQ = "seq.agility_pyramid_gap_jump"
        const val JUMP_FALL_SEQ = "seq.agility_pyramid_gap_jump_fall"
        const val STAIR_UP_SEQ = "seq.human_reachforladder"
        const val STAIR_DOWN_SEQ = "seq.human_climbing_down"

        const val STEPS_UP = "loc.agility_pyramid_steps1"
        const val STEPS_DOWN = "loc.agility_pyramid_steps_top_hotspot"

        val OBSTACLE_LOCS =
            mapOf(
                PyramidObstacleKind.LowWall to
                    listOf("loc.agility_pyramid_low_wall"),
                PyramidObstacleKind.Ledge to
                    listOf(
                        "loc.agility_pyramid_ledge_hotspot",
                        "loc.agility_pyramid_ledgebalance_start_south_hotspot",
                        "loc.agility_pyramid_ledgebalance_end_south_hotspot",
                        "loc.agility_pyramid_ledgebalance_start_west_hotspot",
                        "loc.agility_pyramid_ledgebalance_end_west_hotspot",
                    ),
                PyramidObstacleKind.Plank to
                    listOf(
                        "loc.agility_pyramid_plank_start",
                        "loc.agility_pyramid_plank_end",
                    ),
                PyramidObstacleKind.CrossGap to
                    listOf(
                        "loc.agility_pyramid_wallhang_start_hotspot_ground",
                        "loc.agility_pyramid_wallhang_end_hotspot_ground",
                        "loc.agility_pyramid_wallhang_start_hotspot",
                        "loc.agility_pyramid_wallhang_end_hotspot",
                        "loc.agility_pyramid_wallhang_start_south_hotspot",
                        "loc.agility_pyramid_wallhang_end_south_hotspot",
                        "loc.agility_pyramid_wallhang_start_west_hotspot",
                        "loc.agility_pyramid_wallhang_end_west_hotspot",
                    ),
                PyramidObstacleKind.JumpGap to
                    listOf("loc.agility_pyramid_jump_hotspot"),
            )

        fun facing(from: CoordGrid, to: CoordGrid): Int {
            val dx = to.x - from.x
            val dz = to.z - from.z
            return when {
                dx == 0 && dz == 0 -> Constants.em_face_south
                abs(dx) >= abs(dz) * 2 -> if (dx > 0) Constants.em_face_east else Constants.em_face_west
                abs(dz) >= abs(dx) * 2 ->
                    if (dz > 0) Constants.em_face_north else Constants.em_face_south
                dx > 0 -> if (dz > 0) Constants.em_face_northeast else Constants.em_face_southeast
                else -> if (dz > 0) Constants.em_face_northwest else Constants.em_face_southwest
            }
        }
    }
}
