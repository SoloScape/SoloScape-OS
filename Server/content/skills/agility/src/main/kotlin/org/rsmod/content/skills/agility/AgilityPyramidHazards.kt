package org.rsmod.content.skills.agility

import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.MoveRestrict
import jakarta.inject.Inject
import java.util.IdentityHashMap
import java.util.WeakHashMap
import kotlin.math.abs
import kotlin.math.sign
import org.rsmod.api.config.Constants
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.stat.agilityLvl
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
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

internal data class PyramidStoneTrap(
    val tiltVarbit: String,
    val safeDx: Int?,
    val safeDz: Int?,
    val tiles: Set<CoordGrid>,
) {
    fun isForward(stepDx: Int, stepDz: Int): Boolean =
        when {
            safeDx == null || safeDz == null -> true
            safeDx != 0 -> stepDx == safeDx
            else -> stepDz == safeDz
        }

    fun traversalDirection(stepDx: Int, stepDz: Int): Pair<Int, Int> =
        if (safeDx != null && safeDz != null) {
            safeDx to safeDz
        } else {
            stepDx to stepDz
        }
}

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
        get() = occupiedTiles(extended)

    fun occupiedTiles(anchor: CoordGrid): Set<CoordGrid> =
        buildSet {
            for (dx in 0..1) {
                for (dz in 0..1) {
                    add(CoordGrid(anchor.x + dx, anchor.z + dz, anchor.level))
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
                "varbit.agility_pyramid_tilt_1",
                -1,
                0,
                point(3354, 2841, 1),
                point(3355, 2841, 1),
                point(3354, 2842, 1),
                point(3355, 2842, 1),
            ),
            trap(
                "varbit.agility_pyramid_tilt_2",
                1,
                0,
                point(3374, 2835, 1),
                point(3375, 2835, 1),
                point(3374, 2836, 1),
                point(3375, 2836, 1),
            ),
            trap(
                "varbit.agility_pyramid_tilt_3",
                0,
                1,
                point(3368, 2849, 2),
                point(3369, 2849, 2),
                point(3368, 2850, 2),
                point(3369, 2850, 2),
            ),
            trap(
                "varbit.agility_pyramid_tilt_4",
                null,
                null,
                point(3048, 4699, 2),
                point(3049, 4699, 2),
                point(3048, 4700, 2),
                point(3049, 4700, 2),
            ),
            trap(
                "varbit.agility_pyramid_tilt_5",
                null,
                null,
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

    fun stoneSuccessChance(level: Int): Double =
        when {
            level <= STONE_BASE_LEVEL -> STONE_BASE_CHANCE
            level >= STONE_NO_FAIL_LEVEL -> 100.0
            else ->
                STONE_BASE_CHANCE +
                    (level - STONE_BASE_LEVEL) *
                        ((100.0 - STONE_BASE_CHANCE) / (STONE_NO_FAIL_LEVEL - STONE_BASE_LEVEL))
        }

    private fun trap(
        tiltVarbit: String,
        safeDx: Int?,
        safeDz: Int?,
        vararg tiles: CoordGrid,
    ) = PyramidStoneTrap(tiltVarbit, safeDx, safeDz, tiles.toSet())

    private const val STONE_BASE_LEVEL = 30
    private const val STONE_NO_FAIL_LEVEL = 70
    private const val STONE_BASE_CHANCE = 75.0

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
    private val pushCooldowns = WeakHashMap<Player, Int>()

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
        val stepDx = (args.trigger.x - args.previous.x).sign
        val stepDz = (args.trigger.z - args.previous.z).sign
        if (stepDx == 0 && stepDz == 0) {
            return
        }

        val trap = AgilityPyramidHazardData.stoneTrapAt(args.trigger) ?: return
        val (dx, dz) = trap.traversalDirection(stepDx, stepDz)
        val forward = trap.isForward(stepDx, stepDz)
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
        VarPlayerIntMapSetter.set(player, trap.tiltVarbit, 1)

        try {
            val successChance = AgilityPyramidHazardData.stoneSuccessChance(player.agilityLvl)
            val failed = !forward || random.randomDouble() * 100.0 >= successChance
            if (failed) {
                anim(STONE_FAIL_SEQ)
                exactMove(
                    args.trigger,
                    exit,
                    0,
                    STONE_ROLL_TICKS * CLIENT_CYCLES_PER_TICK,
                    facing(args.trigger, exit),
                    TeleportType.Exempt,
                )
                delay(STONE_ROLL_TICKS)
                telejump(
                    AgilityPyramidObstacleData.dropOneLayer(exit),
                    TeleportType.Exempt,
                )
                resetAnim()
                queueHit(
                    delay = 0,
                    type = HitType.Typeless,
                    damage = if (forward) STONE_FAIL_DAMAGE else STONE_REVERSE_DAMAGE,
                )
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
        } finally {
            VarPlayerIntMapSetter.set(player, trap.tiltVarbit, 0)
        }
    }

    private fun tickBlock(npc: Npc, blocksById: Map<Int, PyramidBlockSpec>) {
        val state =
            blockStates[npc]
                ?: run {
                    val spec = blocksById[npc.id] ?: return
                    MovingBlockState(spec).also { blockStates[npc] = it }
                }

        when (state.phase) {
            BLOCK_EXTEND_PHASE -> npc.walk(state.spec.extended)
            BLOCK_FIRST_PUSH_CHECK,
            BLOCK_SECOND_PUSH_CHECK,
            -> pushPlayers(npc, state.spec)
            BLOCK_RETRACT_PHASE -> npc.walk(state.spec.spawn)
        }
        state.phase = (state.phase + 1) % BLOCK_CYCLE_TICKS
    }

    private fun pushPlayers(npc: Npc, spec: PyramidBlockSpec) {
        val occupied = spec.occupiedTiles(npc.coords)
        for (player in players) {
            if (player.coords !in occupied) {
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
        val pushTicks = start.chebyshevDistance(args.destination).coerceAtLeast(1)
        anim(if (pushTicks == 1) BLOCK_PUSH_SHORT_SEQ else BLOCK_PUSH_LONG_SEQ)
        exactMove(
            start,
            args.destination,
            0,
            pushTicks * CLIENT_CYCLES_PER_TICK,
            facing(args.destination, start),
            TeleportType.Exempt,
        )
        delay(pushTicks)
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

        const val STAT_AGILITY = "stat.agility"
        const val CLIENT_CYCLES_PER_TICK = 30

        const val STONE_XP = 12.0
        const val STONE_FAIL_DAMAGE = 6
        const val STONE_REVERSE_DAMAGE = 1
        const val STONE_ROLL_DISTANCE = 2
        const val STONE_ROLL_TICKS = 2
        const val STONE_SUCCESS_SEQ = "seq.agilityarena_dive_player"
        const val STONE_FAIL_SEQ = "seq.agility_pyramid_tilt_fall"

        const val BLOCK_PUSH_DAMAGE = 6
        const val BLOCK_PUSH_SHORT_SEQ = "seq.agility_pyramid_block_push_1"
        const val BLOCK_PUSH_LONG_SEQ = "seq.agility_pyramid_block_push_2"
        const val BLOCK_PUSH_COOLDOWN = 4
        const val BLOCK_CYCLE_TICKS = 16
        const val BLOCK_EXTEND_PHASE = 0
        const val BLOCK_FIRST_PUSH_CHECK = 1
        const val BLOCK_SECOND_PUSH_CHECK = 2
        const val BLOCK_RETRACT_PHASE = 6

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
