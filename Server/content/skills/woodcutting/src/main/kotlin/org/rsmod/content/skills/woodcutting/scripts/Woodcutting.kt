package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.SequenceServerType
import jakarta.inject.Inject
import org.rsmod.api.config.Constants
import org.rsmod.api.config.locParam
import org.rsmod.api.config.locXpParam
import org.rsmod.api.config.objParam
import org.rsmod.api.config.refs.params
import org.rsmod.api.controller.vars.intVarCon
import org.rsmod.api.player.output.ClientScripts
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.righthand
import org.rsmod.api.player.stat.firemakingLvl
import org.rsmod.api.player.stat.woodcuttingLvl
import org.rsmod.api.random.GameRandom
import org.rsmod.api.repo.controller.ControllerRepository
import org.rsmod.api.repo.loc.LocRepository
import org.rsmod.api.repo.player.PlayerRepository
import org.rsmod.api.script.onAiConTimer
import org.rsmod.api.script.onOpContentLoc1
import org.rsmod.api.script.onOpContentLoc3
import org.rsmod.api.script.onOpContentU
import org.rsmod.api.script.onOpContentMixedLocU
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpLoc3
import org.rsmod.api.script.onOpLocU
import org.rsmod.api.stats.levelmod.InvisibleLevels
import org.rsmod.content.quest.manager.QuestRequirements
import org.rsmod.content.skills.woodcutting.configs.WoodcuttingParams
import org.rsmod.game.MapClock
import org.rsmod.game.entity.Controller
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.type.getInvObj
import org.rsmod.map.zone.ZoneKey
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class Woodcutting
@Inject
constructor(
    private val locRepo: LocRepository,
    private val conRepo: ControllerRepository,
    private val playerRepo: PlayerRepository,
    private val harvest: WoodcuttingHarvest,
    private val invisibleLvls: InvisibleLevels,
    private val mapClock: MapClock,
    private val forestry: ForestryEventManager,
) : PluginScript() {
    override fun ScriptContext.startup() {
        onOpContentLoc1("content.tree") { attempt(it.loc, it.type) }
        onOpContentLoc3("content.tree") { cut(it.loc, it.type) }
        onOpContentU("content.tree", "content.woodcutting_axe") { cut(it.loc, it.type) }
        for (axe in WoodcuttingAxes.fellingConversions.values + "obj.infernal_axe_empty" + "obj.crystal_axe_inactive") {
            onOpContentMixedLocU("content.tree", axe) { cut(it.loc, it.type) }
        }
        for (tree in SpecialTreeDefinitions.naturalNames + SpecialTreeDefinitions.farmedNames) {
            onOpLoc1(tree) { attempt(it.loc, it.type) }
            onOpLoc3(tree) { cut(it.loc, it.type) }
            onOpLocU(tree) {
                if (WoodcuttingAxes.effectiveType(InvObj(it.objType)).isContentType("content.woodcutting_axe")) {
                    cut(it.loc, it.type)
                }
            }
        }
        onAiConTimer("controller.woodcutting_tree_duration") { controller.treeDespawnTick() }
    }

    private fun ProtectedAccess.attempt(tree: BoundLocInfo, type: ObjectServerType) {
        if (!checkFarmedTreeReady(tree, type)) return
        if (player.woodcuttingLvl < type.treeLevelReq) {
            mes("You need a Woodcutting level of ${type.treeLevelReq} to chop down this tree.")
            return
        }

        if (inv.isFull() &&
            !(ForestryLogBasket.isOpen(player) && ForestryLogBasket.availableSpace(player) > 0 &&
                type.treeLogs.internalName in ForestryRules.logs)) {
            val product = type.treeLogs
            mes("Your inventory is too full to hold any more ${product.name.lowercase()}.")
            soundSynth("synth.pillory_wrong")
            return
        }

        if (actionDelay < mapClock) {
            actionDelay = mapClock + 3
            skillAnimDelay = mapClock + 3
            opLoc1(tree)
        } else {
            val axe = findAxe(player, type)
            if (axe == null) {
                mesAxeMissing()
                return
            }
            anim(axeAnim(axe))
            spam("You swing your axe at the tree.")
            cut(tree, type)
        }
    }

    private fun ProtectedAccess.cut(tree: BoundLocInfo, type: ObjectServerType) {
        if (!checkFarmedTreeReady(tree, type)) return
        val axe = findAxe(player, type)
        if (axe == null) {
            mesAxeMissing()
            return
        }

        if (player.woodcuttingLvl < type.treeLevelReq) {
            mes("You need a Woodcutting level of ${type.treeLevelReq} to chop down this tree.")
            return
        }

        if (inv.isFull() &&
            !(ForestryLogBasket.isOpen(player) && ForestryLogBasket.availableSpace(player) > 0 &&
                type.treeLogs.internalName in ForestryRules.logs)) {
            val product = type.treeLogs
            mes("Your inventory is too full to hold any more ${product.name.lowercase()}.")
            soundSynth("synth.pillory_wrong")
            return
        }

        if (skillAnimDelay <= mapClock) {
            skillAnimDelay = mapClock + 4
            anim(axeAnim(axe))
        }

        var cutLogs = false
        val wasSkillingRoll = actionDelay == mapClock
        val despawn: Boolean

        if (actionDelay < mapClock) {
            actionDelay = mapClock + 3
        } else if (actionDelay == mapClock) {
            val (low, high) = cutSuccessRates(type, axe)
            cutLogs = statRandom("stat.woodcutting", low, high, invisibleLvls)
        }

        if (type.hasDespawnTimer) {
            treeSwingDespawnTick(tree, type)
            despawn = cutLogs && isTreeDespawnRequired(tree)
        } else if (type.specialTree?.depletionDenominator?.let { it > 0 } == true) {
            despawn = cutLogs && random.of(type.specialTree!!.depletionDenominator) == 0
        } else {
            despawn = cutLogs && random.of(1, 255) > type.treeDepleteChance
        }

        if (cutLogs) {
            cutLogs = with(harvest) {
                harvest(tree, type.treeLogs, type.treeXp, axe)
            }
        }

        if (wasSkillingRoll) {
            forestry.onChop(player, tree.coords, type, despawn && cutLogs, cutLogs)
        }

        if (despawn && cutLogs) {
            if (type.internalName in SpecialTreeDefinitions.farmedNames) {
                // Farmed trees are personal: never mutate the shared world loc.
                FarmedHardwoodCooldowns.deplete(player, tree.coords, type.treeRespawnTime)
                resetAnim()
                mes("You have cut down your tree. It will regrow shortly.")
                return
            }
            val respawnTime = type.resolveRespawnTime(random)
            locRepo.change(tree, type.treeStump, respawnTime)
            resetAnim()
            soundSynth("synth.tree_fall_sound")
            sendLocalOverlayLoc(tree, type, respawnTime)
        }

        opLoc3(tree)
    }

    private fun ProtectedAccess.checkFarmedTreeReady(
        tree: BoundLocInfo,
        type: ObjectServerType,
    ): Boolean {
        if (type.internalName !in SpecialTreeDefinitions.farmedNames) return true
        val remaining = FarmedHardwoodCooldowns.remainingMillis(player, tree.coords)
        if (remaining == 0L) return true
        mes("Your tree has been cut down. It will regrow in ${(remaining + 999) / 1000} seconds.")
        resetAnim()
        return false
    }

    private fun Controller.treeDespawnTick() {
        val type = ServerCacheManager.getObject(treeLocId)!!
        val tree = locRepo.findExact(coords, type)
        if (tree == null) {
            // Make sure the controller has lived beyond a single tick. Otherwise, we can make an
            // educated guess that there's an oversight allowing the tree to recreate controllers
            // faster than we'd expect. (1 tick intervals in this case)
            check(mapClock > creationCycle + 1) { "Tree loc deleted faster than expected." }
            conRepo.del(this)
            return
        }

        // If tree is actively being cut down by a player, increment the associated varcon.
        if (treeLastCut == mapClock.cycle - 1) {
            treeActivelyCutTicks++
        } else {
            treeActivelyCutTicks--
        }

        // If the tree has been idle (not cut) for a duration equal to or longer than the time it
        // was actively cut, the controller is no longer needed and can be safely deleted.
        if (treeActivelyCutTicks <= 0) {
            conRepo.del(this)
            return
        }

        // Reset the timer for next tick.
        aiTimer(1)

        // Keep the controller alive.
        resetDuration()
    }

    private fun treeSwingDespawnTick(tree: BoundLocInfo, type: ObjectServerType) {
        val controller = conRepo.findExact(tree.coords, "controller.woodcutting_tree_duration")
        if (controller != null) {
            check(controller.treeLocId == tree.id) {
                "Controller in coords is not associated with tree: " +
                    "controller=$controller, treeLoc=$tree, treeType=$type"
            }
            controller.treeLastCut = mapClock.cycle
            return
        }

        val spawn = Controller("controller.woodcutting_tree_duration", tree.coords)
        conRepo.add(spawn, type.treeDespawnTime)

        spawn.treeLocId = tree.id
        spawn.treeLastCut = mapClock.cycle
        spawn.treeActivelyCutTicks = 0
        spawn.aiTimer(1)
    }

    private fun isTreeDespawnRequired(tree: BoundLocInfo): Boolean {
        val controller = conRepo.findExact(tree.coords, "controller.woodcutting_tree_duration")
        return controller != null && controller.treeActivelyCutTicks >= controller.durationStart
    }

    private fun sendLocalOverlayLoc(tree: BoundLocInfo, type: ObjectServerType, respawnTime: Int) {
        val players = playerRepo.findAll(ZoneKey.from(tree.coords), zoneRadius = 3)
        for (player in players) {
            ClientScripts.addOverlayTimerLoc(
                player = player,
                coords = tree.coords,
                loc = type,
                shape = tree.shape,
                timer = Constants.overlay_timer_woodcutting,
                ticks = respawnTime,
                colour = 16765184,
            )
        }
    }

    private fun ProtectedAccess.axeAnim(axe: InvObj): String =
        WoodcuttingAxes.animation(getInvObj(axe).internalName)
            ?: RSCM.getReverseMapping(RSCMType.SEQ, WoodcuttingAxes.effectiveType(axe).axeWoodcuttingAnim.id)

    private fun ProtectedAccess.mesAxeMissing() {
        mes("You need an axe to chop down this tree.")
        when {
            player.hasBlockedInfernalAxe() ->
                mes("You need a Firemaking level of 85 to use the infernal axe.")
            player.hasBlockedCrystalAxe() ->
                mes("You need to complete Song of the Elves to use this axe.")
            else -> mes("You do not have an axe which you have the woodcutting level to use.")
        }
    }

    companion object {
        private const val INFERNAL_FIREMAKING_REQ = 85
        private const val SONG_OF_THE_ELVES = "quest_songoftheelves"

        var Controller.treeActivelyCutTicks: Int by intVarCon("varcon.woodcutting_tree_cut_ticks")
        var Controller.treeLastCut: Int by intVarCon("varcon.woodcutting_tree_last_cut")
        var Controller.treeLocId: Int by intVarCon("varcon.woodcutting_tree_loc")

        val ItemServerType.axeWoodcuttingReq: Int by objParam(params.levelrequire)
        val ItemServerType.axeWoodcuttingAnim: SequenceServerType by objParam(params.skill_anim)

        private val ObjectServerType.specialTree: SpecialTreeDefinition?
            get() = SpecialTreeDefinitions.get(internalName)

        private val ObjectServerType.configuredTreeLevelReq: Int by locParam(params.levelrequire)
        private val ObjectServerType.configuredTreeLogs: ItemServerType by locParam(params.skill_productitem)
        private val ObjectServerType.configuredTreeXp: Double by locXpParam(params.skill_xp)
        private val ObjectServerType.configuredTreeStump: ObjectServerType by locParam(params.next_loc_stage)
        private val ObjectServerType.configuredTreeDespawnTime: Int by locParam(params.despawn_time)
        private val ObjectServerType.configuredTreeRespawnTime: Int by locParam(params.respawn_time)

        val ObjectServerType.treeLevelReq: Int
            get() = specialTree?.level ?: configuredTreeLevelReq
        val ObjectServerType.treeLogs: ItemServerType
            get() = specialTree?.let { ServerCacheManager.getItem(it.product.asRSCM(RSCMType.OBJ))!! }
                ?: configuredTreeLogs
        val ObjectServerType.treeXp: Double
            get() = specialTree?.xp ?: configuredTreeXp
        val ObjectServerType.treeStump: ObjectServerType
            get() = specialTree?.let { ServerCacheManager.getObject(it.stump.asRSCM(RSCMType.LOC))!! }
                ?: configuredTreeStump
        val ObjectServerType.treeDespawnTime: Int
            get() = specialTree?.despawnTicks ?: configuredTreeDespawnTime
        val ObjectServerType.treeDepleteChance: Int by locParam(params.deplete_chance)
        val ObjectServerType.treeRespawnTime: Int
            get() = specialTree?.respawnTicks ?: configuredTreeRespawnTime
        val ObjectServerType.treeRespawnTimeLow: Int by locParam(params.respawn_time_low)
        val ObjectServerType.treeRespawnTimeHigh: Int by locParam(params.respawn_time_high)

        private val ObjectServerType.hasDespawnTimer: Boolean
            get() = specialTree?.let { it.despawnTicks > 0 } ?: hasParam(params.despawn_time)

        /**
         * Special resources which are not ordinary trees have no axe-rate loc params.
         * Reuse the normal usability and quest/Firemaking gates, but rank by axe tier.
         */
        fun findAxeForSpecialResource(player: Player): InvObj? =
            (listOfNotNull(player.wornAxe()) + player.carriedAxes())
                .maxByOrNull { WoodcuttingAxes.effectiveType(it).axeWoodcuttingReq }

        fun findAxe(player: Player, tree: ObjectServerType): InvObj? {
            val worn = player.wornAxe()
            val carried = player.carriedAxes()
            val candidates =
                buildList {
                    if (worn != null) {
                        add(worn)
                    }
                    addAll(carried)
                }
            return candidates.maxWithOrNull(axeComparator(tree).thenBy {
                ForestryRations.available(player) && WoodcuttingAxes.isFelling(getInvObj(it).internalName)
            })
        }

        private fun axeComparator(tree: ObjectServerType): Comparator<InvObj> =
            Comparator { left, right ->
                axeAverageRate(tree, left).compareTo(axeAverageRate(tree, right))
            }

        private fun axeAverageRate(tree: ObjectServerType, axe: InvObj): Int {
            val (low, high) = cutSuccessRates(tree, axe)
            return (low + high) / 2
        }

        private fun Player.wornAxe(): InvObj? {
            val righthand = righthand ?: return null
            return righthand.takeIf { it.isUsableAxe(this) }
        }

        private fun Player.carriedAxes(): List<InvObj> =
            inv.filterNotNull { it.isUsableAxe(this) }

        private fun InvObj.isUsableAxe(player: Player): Boolean {
            val actual = getInvObj(this)
            val effective = WoodcuttingAxes.effectiveType(this)
            if (!effective.isContentType("content.woodcutting_axe") ||
                player.woodcuttingLvl < effective.axeWoodcuttingReq
            ) {
                return false
            }
            return when (actual.internalName) {
                "obj.infernal_axe" -> player.firemakingLvl >= INFERNAL_FIREMAKING_REQ
                "obj.crystal_axe",
                "obj.crystal_axe_inactive",
                "obj.crystal_axe_2h",
                "obj.crystal_axe_2h_inactive", ->
                    QuestRequirements.hasCompleted(player, SONG_OF_THE_ELVES)
                else -> true
            }
        }

        private fun Player.hasBlockedInfernalAxe(): Boolean =
            ownsAxe("obj.infernal_axe") && firemakingLvl < INFERNAL_FIREMAKING_REQ

        private fun Player.hasBlockedCrystalAxe(): Boolean =
            (ownsAxe("obj.crystal_axe") || ownsAxe("obj.crystal_axe_inactive") ||
                ownsAxe("obj.crystal_axe_2h") || ownsAxe("obj.crystal_axe_2h_inactive")) &&
                !QuestRequirements.hasCompleted(this, SONG_OF_THE_ELVES)

        private fun Player.ownsAxe(name: String): Boolean =
            (righthand != null && getInvObj(righthand!!).internalName == name) ||
                inv.any { it != null && getInvObj(it).internalName == name }

        private fun ObjectServerType.resolveRespawnTime(random: GameRandom): Int {
            val fixed = treeRespawnTime
            if (fixed > 0) {
                return fixed
            }
            return random.of(treeRespawnTimeLow, treeRespawnTimeHigh)
        }

        fun cutSuccessRates(treeType: ObjectServerType, axe: InvObj): Pair<Int, Int> {
            val effective = WoodcuttingAxes.effectiveType(axe)
            SpecialTreeDefinitions.rates(treeType.internalName, effective.internalName)?.let { return it }
            val axes = treeType.param(WoodcuttingParams.success_rates)
            val rates = axes.find { it.key.id == effective.id }?.value
                ?: error("Unable to get axe rates for ${effective.internalName}")
            val low = rates shr 16
            val high = rates and 0xFFFF
            return low to high
        }
    }
}
