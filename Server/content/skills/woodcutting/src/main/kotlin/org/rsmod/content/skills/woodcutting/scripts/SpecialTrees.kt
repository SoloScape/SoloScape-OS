package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import jakarta.inject.Inject
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.stat.woodcuttingLvl
import org.rsmod.api.player.vars.boolVarBit
import org.rsmod.api.player.vars.intVarBit
import org.rsmod.api.random.GameRandom
import org.rsmod.api.repo.obj.ObjRepository
import org.rsmod.content.quest.manager.QuestRequirements
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpLoc3
import org.rsmod.api.script.onOpLocU
import org.rsmod.api.stats.levelmod.InvisibleLevels
import org.rsmod.content.skills.woodcutting.scripts.Woodcutting.Companion.axeWoodcuttingAnim
import org.rsmod.game.MapClock
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.loc.BoundLocInfo
import org.rsmod.game.type.getInvObj
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

internal var Player.sulliuscepStage by intVarBit("varbit.fossil_cep")
private var Player.fossilDropsBlocked by boolVarBit("varbit.fossil_drop_blocked")
private var Player.rareFossilDropsBlocked by boolVarBit("varbit.fossil_drop_rare_blocked")

internal data class SulliuscepProduct(val item: String, val count: Int = 1)

/** Sequential pre-roll table, followed by the 90/9/1 mushroom table. */
internal fun sulliuscepProduct(
    random: GameRandom,
    fossilsBlocked: Boolean,
    rareBlocked: Boolean,
): SulliuscepProduct {
    if (random.of(175) < 45) return SulliuscepProduct("obj.fossil_numulite", random.of(5, 16))
    if (!fossilsBlocked) {
        if (random.of(350) < 5) return SulliuscepProduct("obj.fossil_small_unid")
        if (random.of(700) < 5) return SulliuscepProduct("obj.fossil_medium_unid")
        if (random.of(875) < 5) return SulliuscepProduct("obj.fossil_large_unid")
    }
    if (!rareBlocked && random.of(3500) < 5) return SulliuscepProduct("obj.fossil_rare_unid")
    return SulliuscepProduct(when (random.of(100)) {
        in 0..89 -> "obj.bittercap_mushroom"
        in 90..98 -> "obj.mortmyremushroom"
        else -> "obj.fossil_sulliuscep_cap"
    })
}

/** Ordinary nest type distribution, from the current Bird_nest developer-confirmed table. */
internal fun ordinaryBirdNest(roll: Int): String = when (roll) {
    0 -> "obj.bird_nest_egg_red"
    1 -> "obj.bird_nest_egg_blue"
    2 -> "obj.bird_nest_egg_green"
    in 3..34 -> "obj.bird_nest_ring"
    in 35..99 -> "obj.bird_nest_seeds_jan2019"
    else -> error("Invalid bird nest roll: $roll")
}

/** Base clue rate formula from OSRS Wiki Clue_nest; combat and equipment modifiers are separate. */
internal fun sulliuscepClueDenominator(level: Int, tier: Int): Int {
    val multiplier = listOf(0.2, 1.7, 2.0, 3.3, 10.0)[tier]
    return (343_000.0 / (100 + level.coerceAtLeast(1)) * multiplier).toInt().coerceAtLeast(1)
}

/** Native personal mushroom rotation and the never-felled blisterwood tree. */
class SpecialTrees @Inject constructor(
    private val mapClock: MapClock,
    private val invisibleLvls: InvisibleLevels,
    private val harvest: WoodcuttingHarvest,
    private val objRepo: ObjRepository,
) : PluginScript() {
    override fun ScriptContext.startup() {
        val axes = ServerCacheManager.getItems().values.filter {
            it.isContentType("content.woodcutting_axe") ||
                it.internalName in WoodcuttingAxes.fellingConversions.values ||
                it.internalName == "obj.infernal_axe_empty"
        }
        for (name in listOf("loc.fossil_cep_grown", "loc.blisterwood_tree")) {
            onOpLoc1(name) { chop(it.loc, it.type, initial = true) }
            onOpLoc3(name) { chop(it.loc, it.type, initial = false) }
            for (axe in axes) onOpLocU(name, axe.internalName) {
                chop(it.loc, it.type, initial = true)
            }
        }
    }

    internal fun ProtectedAccess.chop(tree: BoundLocInfo, type: ObjectServerType, initial: Boolean) {
        val definition = SpecialTreeDefinitions.get(type.internalName) ?: return
        val cep = type.internalName == "loc.fossil_cep_grown"
        // Op events resolve the player's native multi-loc; retain the base parent for continuation.
        if (cep) {
            val baseName = ServerCacheManager.getObject(tree.id)?.internalName ?: return
            val expected = baseName.removePrefix("loc.fossil_cep_multi").toIntOrNull()?.minus(1)
            if (expected == null || expected != player.sulliuscepStage) return
        }
        if (player.woodcuttingLvl < definition.level) {
            mes("You need a Woodcutting level of ${definition.level} to cut this ${if (cep) "sulliuscep" else "tree"}.")
            return
        }
        val axe = Woodcutting.findAxe(player, type)
        if (axe == null) {
            mes("You need an axe which you have the Woodcutting level to use.")
            return
        }
        if (inv.isFull()) {
            mes("Your inventory is too full to hold any more ${if (cep) "mushrooms" else "logs"}.")
            resetAnim()
            return
        }
        if (skillAnimDelay <= mapClock) {
            skillAnimDelay = mapClock + 4
            animateAxe(axe)
        }
        if (initial) spam("You swing your axe at the ${if (cep) "sulliuscep" else "tree"}.")
        if (actionDelay < mapClock) {
            actionDelay = mapClock + 3
        } else if (actionDelay == mapClock) {
            actionDelay = mapClock + 4
            val rates = Woodcutting.cutSuccessRates(type, axe)
            if (statRandom("stat.woodcutting", rates.first, rates.second, invisibleLvls)) {
                val product = if (cep) {
                    sulliuscepProduct(random, player.fossilDropsBlocked, player.rareFossilDropsBlocked)
                } else SulliuscepProduct(definition.product)
                val item = checkNotNull(ServerCacheManager.getItem(product.item.asRSCM(RSCMType.OBJ)))
                if (with(harvest) { harvest(tree, item, definition.xp, axe, product.count) }) {
                    if (cep) {
                        rollBirdNest()
                        rollClueNests()
                    }
                    if (random.of(definition.depletionDenominator) == 0) {
                        if (cep) player.sulliuscepStage = SpecialTreeDefinitions.nextSulliuscep(player.sulliuscepStage)
                        else mes("A small spider jumps at you from the log you just cut.")
                        resetAnim()
                        return
                    }
                }
            }
        }
        opLoc3(tree)
    }

    private fun ProtectedAccess.rollBirdNest() {
        if (random.of(256) != 0) return
        val rabbitFoot = player.worn.any { it != null && getInvObj(it).name == "Strung rabbit foot" }
        val nest = ordinaryBirdNest(random.of(if (rabbitFoot) 95 else 100))
        objRepo.add(nest, player.coords, 300, player)
        mes("A bird's nest falls out of the tree.")
    }

    private fun ProtectedAccess.rollClueNests() {
        // Current Sulliuscep documentation allows ordinary nests and separate clue-tier rolls.
        val boxes = QuestRequirements.hasCompleted(player, "quest_xmarksthespot")
        val tiers = listOf("beginner", "easy", "medium", "hard", "elite")
        for ((index, tier) in tiers.withIndex()) {
            val ownsClue = !boxes && player.invMap.values.any { inventory ->
                inventory.any { obj ->
                    if (obj == null) false else {
                        val type = getInvObj(obj)
                        type.internalName == "obj.wc_clue_nest_$tier" ||
                            ((type.name.contains("Clue scroll", true) || type.name.contains("Challenge scroll", true)) &&
                                type.name.contains("($tier)", true))
                    }
                }
            }
            if (!ownsClue && random.of(sulliuscepClueDenominator(player.woodcuttingLvl, index)) == 0) {
                if (boxes) {
                    objRepo.add("obj.bird_nest_empty", player.coords, 300, player)
                    objRepo.add("obj.league_clue_box_$tier", player.coords, 300, player)
                } else objRepo.add("obj.wc_clue_nest_$tier", player.coords, 300, player)
                mes("A bird's nest falls out of the tree.")
            }
        }
    }

    private fun ProtectedAccess.animateAxe(axe: InvObj) {
        val name = getInvObj(axe).internalName
        val felling = WoodcuttingAxes.animation(name)
        if (felling != null) anim(felling)
        else {
            val seq = WoodcuttingAxes.effectiveType(axe).axeWoodcuttingAnim
            anim(dev.openrune.rscm.RSCM.getReverseMapping(RSCMType.SEQ, seq.id))
        }
    }
}
