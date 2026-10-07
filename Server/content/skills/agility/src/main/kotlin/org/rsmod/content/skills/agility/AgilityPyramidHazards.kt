package org.rsmod.content.skills.agility

import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.MoveRestrict
import jakarta.inject.Inject
import java.util.IdentityHashMap
import kotlin.math.abs
import kotlin.math.sign
import org.rsmod.api.config.Constants
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.stat.agilityLvl
import org.rsmod.api.script.onEvent
import org.rsmod.api.script.onNpcTimer
import org.rsmod.api.script.onPlayerCoordsChanged
import org.rsmod.api.script.onPlayerQueueWithArgs
import org.rsmod.api.stats.xpmod.XpModifiers
import org.rsmod.game.entity.Npc
import org.rsmod.game.entity.Player
import org.rsmod.game.entity.PlayerList
import org.rsmod.game.entity.npc.NpcStateEvents
import org.rsmod.game.hit.HitType
import org.rsmod.map.CoordGrid
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext
import skillSuccess

internal data class PyramidStoneTrap(val tiles: Set<CoordGrid>)

internal enum class PyramidBlockAxis {
    East,
    North,
}

internal data class PyramidBlockSpec(
    val npc: String,
    val spawn: CoordGrid,
    val axis: PyramidBlockAxis,
) {
    val extended: CoordGrid
        get() =
            when (axis) {
                PyramidBlockAxis.East -> CoordGrid(spawn.x + 2, spawn.z, spawn.level)
                PyramidBlockAxis.North -> CoordGrid(spawn.x, spawn.z + 2, spawn.level)
            }

    val extendedTiles: Set<CoordGrid>
        get() =
            buildSet {
                for (dx in 0..1) {
                    for (dz in 0..1) {
                        add(CoordGrid(extended.x + dx, extended.z + dz, extended.level))
                    }
                }
            }

    fun pushDestination(player: CoordGrid): CoordGrid =
        when (axis) {
            PyramidBlockAxis.East -> CoordGrid(extended.x + 2, player.z, player.level)
            PyramidBlockAxis.North -> CoordGrid(player.x, extended.z + 2, player.level)
        }
}

internal object AgilityPyramidHazardData {
    val stoneTraps =
        listOf(
            trap(
                point(3354, 2841, 1),
                point(3355, 2841, 1),
                point(3354, 2842, 1),
                point(3355, 2842, 1),
            ),
            trap(
                point(3374, 2835, 1),
                point(3375, 2835, 1),
                point(3374, 2836, 1),
                point(3375, 2836, 1),
            ),
            trap(
                point(3368, 2849, 2),
                point(3369, 2849, 2),
                point(3368, 2850, 2),
                point(3369, 2850, 2),
            ),
            trap(
                point(3048, 4699, 2),
                point(3049, 4699, 2),
                point(3048, 4700, 2),
                point(3049, 4700, 2),
            ),
            trap(
                point(3044, 4699, 3),
                point(3045, 4699, 3),
                point(3044, 4700, 3),
                point(3045, 4700, 3),
            ),
        )

    val movingBlocks =
        listOf(
            PyramidBlockSpec(
                npc = "npc.agility_pyramid_penny_waterfall_npc_east",
                spawn = point(3372, 2847, 1),
                axis = PyramidBlockAxis.East,
            ),
            PyramidBlockSpec(
                npc = "npc.agility_pyramid_penny_waterfall_npc_north",
                spawn = point(3366, 2845, 3),
                axis = PyramidBlockAxis.North,
            ),
        )

    fun stoneTrapAt(coords: CoordGrid): PyramidStoneTrap? =
        stoneTraps.firstOrNull { coords in it.tiles }

    private fun trap(vararg tiles: CoordGrid) = PyramidStoneTrap(tiles.toSet())

    private fun point(x: Int, z: Int, level: Int) = CoordGrid(x, z, level)
}

private data class StoneRollArgs(
    val trigger: CoordGrid,
    val previous: CoordGrid,
)

private data class BlockPushArgs(val destination: CoordGrid)

private data class MovingBlockState(
    val spec: PyramidBlockSpec,
    var phase: Int = 0,
)

class AgilityPyramidHazards
@Inject
constructor(
    private val players: PlayerList,
    private val xpMods: XpModifiers,
) : PluginScript() {
    private val blockStates = IdentityHashMap<Npc, MovingBlockState>()
    private val pushCooldowns = IdentityHashMap<Player, Int>()

    override fun ScriptContext.startup() {
        val blocksById =
            AgilityPyramidHazardData.movingBlocks.associateBy {
                it.npc.asRSCM(RSCMType.NPC)
            }

        onPlayerCoordsChanged {
            queueStoneTrap(player, lastKnownCoords)
        }

        onPlayerQueueWithArgs<StoneRollArgs>(STONE_QUEUE) { event ->
            rollStone(event.args)
        }

        onPlayerQueueWithArgs<BlockPushArgs>(BLOCK_PUSH_QUEUE) { event ->
            pushFromBlock(event.args)
        }

        onEvent<NpcStateEvents.Create> {
            val spec = blocksById[npc.id] ?: return@onEvent
            npc.mode = null
            // The block must be able to extend into an occupied tile so it can shove the player.
            // PassThru affects the block's route validation, while its own 2x2 block-walk collision
            // remains active for players trying to path through it.
            npc.moveRestrict = MoveRestrict.PassThru
            npc.timer(BLOCK_TIMER, 1)
            blockStates[npc] = MovingBlockState(spec)
        }

        onEvent<NpcStateEvents.Delete> {
            blockStates.remove(npc)
        }

        onNpcTimer(BLOCK_TIMER) {
            tickBlock(npc, blocksById)
        }
    }

    override fun ScriptContext.shutdown() {
        for (npc in blockStates.keys) {
            npc.clearTimer(BLOCK_TIMER)
        }
        blockStates.clear()
        pushCooldowns.clear()
    }

    private fun queueStoneTrap(player: Player, lastKnown: CoordGrid) {
        val trigger =
            listOf(player.lastProcessedCoord, player.coords)
                .firstOrNull { coords ->
                    coords != lastKnown &&
                        AgilityPyramidHazardData.stoneTrapAt(coords) != null
                }
                ?: return
        val trap = AgilityPyramidHazardData.stoneTrapAt(trigger) ?: return
        if (lastKnown in trap.tiles) {
            return
        }
        player.queue(STONE_QUEUE, 1, StoneRollArgs(trigger, lastKnown))
    }

    private suspend fun ProtectedAccess.rollStone(args: StoneRollArgs) {
        val dx = (args.trigger.x - args.previous.x).sign
        val dz = (args.trigger.z - args.previous.z).sign
        if (dx == 0 && dz == 0) {
            return
        }

        val exit =
            CoordGrid(
                args.trigger.x + dx * STONE_ROLL_DISTANCE,
                args.trigger.z + dz * STONE_ROLL_DISTANCE,
                args.trigger.level,
            )

        if (coords != args.trigger) {
            telejump(args.trigger, TeleportType.Exempt)
        }
        faceSquare(exit)

        val failed =
            player.agilityLvl < NO_FAIL_LEVEL &&
                !skillSuccess(STONE_SUCCESS_LOW, STONE_SUCCESS_HIGH, player.agilityLvl)
        if (failed) {
            anim(STONE_FAIL_SEQ)
            delay(1)
            telejump(AgilityPyramidObstacleData.dropOneLayer(args.trigger), TeleportType.Exempt)
            resetAnim()
            queueHit(delay = 0, type = HitType.Typeless, damage = STONE_FAIL_DAMAGE)
            mes("The stone block throws you down to the level below.")
            return
        }

        anim(STONE_SUCCESS_SEQ)
        exactMove(
            args.trigger,
            exit,
            0,
            STONE_ROLL_TICKS * CLIENT_CYCLES_PER_TICK,
            facing(args.trigger, exit),
            TeleportType.Exempt,
        )
        delay(STONE_ROLL_TICKS)
        if (coords != exit) {
            teleport(exit, TeleportType.Exempt)
        }
        resetAnim()
        statAdvance(STAT_AGILITY, STONE_XP * xpMods.get(player, STAT_AGILITY))
    }

    private fun tickBlock(npc: Npc, blocksById: Map<Int, PyramidBlockSpec>) {
        val state =
            blockStates[npc]
                ?: run {
                    val spec = blocksById[npc.id] ?: return
                    MovingBlockState(spec).also { blockStates[npc] = it }
                }

        when (state.phase) {
            BLOCK_EXTEND_PHASE -> {
                npc.walk(state.spec.extended)
                pushPlayers(state.spec)
            }
            BLOCK_SECOND_PUSH_CHECK -> pushPlayers(state.spec)
            BLOCK_RETRACT_PHASE -> npc.walk(state.spec.spawn)
        }
        state.phase = (state.phase + 1) % BLOCK_CYCLE_TICKS
    }

    private fun pushPlayers(spec: PyramidBlockSpec) {
        for (player in players) {
            if (player.coords !in spec.extendedTiles) {
                continue
            }
            val cooldown = pushCooldowns[player] ?: -1
            if (cooldown > player.currentMapClock) {
                continue
            }
            pushCooldowns[player] = player.currentMapClock + BLOCK_PUSH_COOLDOWN
            player.queue(
                BLOCK_PUSH_QUEUE,
                1,
                BlockPushArgs(spec.pushDestination(player.coords)),
            )
        }
    }

    private suspend fun ProtectedAccess.pushFromBlock(args: BlockPushArgs) {
        val start = coords
        if (start.level != args.destination.level) {
            return
        }
        faceSquare(args.destination)
        anim(BLOCK_PUSH_SEQ)
        exactMove(
            start,
            args.destination,
            0,
            CLIENT_CYCLES_PER_TICK,
            facing(start, args.destination),
            TeleportType.Exempt,
        )
        delay(1)
        telejump(
            AgilityPyramidObstacleData.dropOneLayer(args.destination),
            TeleportType.Exempt,
        )
        resetAnim()
        queueHit(delay = 0, type = HitType.Typeless, damage = BLOCK_PUSH_DAMAGE)
        mes("The pyramid block knocks you off the level.")
    }

    private companion object {
        const val STONE_QUEUE = "queue.agility_pyramid_stone"
        const val BLOCK_PUSH_QUEUE = "queue.agility_pyramid_block_push"
        const val BLOCK_TIMER = "timer.agility_pyramid_block"

        const val NO_FAIL_LEVEL = 75
        const val STAT_AGILITY = "stat.agility"
        const val CLIENT_CYCLES_PER_TICK = 30

        const val STONE_XP = 12.0
        const val STONE_SUCCESS_LOW = 168
        const val STONE_SUCCESS_HIGH = 320
        const val STONE_FAIL_DAMAGE = 6
        const val STONE_ROLL_DISTANCE = 2
        const val STONE_ROLL_TICKS = 2
        const val STONE_SUCCESS_SEQ = "seq.agilityarena_dive_player"
        const val STONE_FAIL_SEQ = "seq.agilityarena_land_player"

        const val BLOCK_PUSH_DAMAGE = 8
        const val BLOCK_PUSH_SEQ = "seq.agility_pyramid_block_push_2"
        const val BLOCK_PUSH_COOLDOWN = 4
        const val BLOCK_CYCLE_TICKS = 16
        const val BLOCK_EXTEND_PHASE = 0
        const val BLOCK_SECOND_PUSH_CHECK = 1
        const val BLOCK_RETRACT_PHASE = 3

        fun facing(from: CoordGrid, to: CoordGrid): Int {
            val dx = to.x - from.x
            val dz = to.z - from.z
            return when {
                dx == 0 && dz == 0 -> Constants.em_face_south
                abs(dx) >= abs(dz) * 2 ->
                    if (dx > 0) Constants.em_face_east else Constants.em_face_west
                abs(dz) >= abs(dx) * 2 ->
                    if (dz > 0) Constants.em_face_north else Constants.em_face_south
                dx > 0 ->
                    if (dz > 0) Constants.em_face_northeast else Constants.em_face_southeast
                else ->
                    if (dz > 0) Constants.em_face_northwest else Constants.em_face_southwest
            }
        }
    }
}
