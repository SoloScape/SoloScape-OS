package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.stat.woodcuttingLvl
import org.rsmod.api.script.onOpLoc1
import org.rsmod.api.script.onOpLoc3
import org.rsmod.api.script.onOpLocU
import org.rsmod.api.stats.xpmod.XpModifiers
import org.rsmod.content.quest.manager.QuestRequirements
import org.rsmod.content.skills.woodcutting.scripts.Woodcutting.Companion.axeWoodcuttingAnim
import org.rsmod.game.MapClock
import org.rsmod.game.inv.InvObj
import org.rsmod.game.type.getInvObj
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

/**
 * The post-Final-Dawn, never-depleting resource on the native transformed root.
 * This intentionally does not make the quest-only transform visible to unfinished players,
 * or invent a bypass around the still-missing quest access route.
 */
class InfectedRoots @Inject constructor(
    private val clock: MapClock,
    private val xpMods: XpModifiers,
) : PluginScript() {
    override fun ScriptContext.startup() {
        for (name in listOf("loc.demon_tear_tree_3x3_op")) {
            onOpLoc1(name) { harvest(initial = true) }
            onOpLoc3(name) { harvest(initial = false) }
            val axes = ServerCacheManager.getItems().values.filter {
                it.isContentType("content.woodcutting_axe") ||
                    it.internalName in WoodcuttingAxes.fellingConversions.values ||
                    it.internalName == "obj.infernal_axe_empty"
            }
            for (axe in axes) onOpLocU(name, axe.internalName) { harvest(initial = true) }
        }
    }

    private fun ProtectedAccess.harvest(initial: Boolean) {
        if (!QuestRequirements.hasCompleted(player, "quest_vmq4")) {
            mes("You must complete The Final Dawn before gathering demon tears.")
            return
        }
        if (player.woodcuttingLvl < LEVEL) {
            mes("You need a Woodcutting level of $LEVEL to chop these roots.")
            return
        }
        val axe = Woodcutting.findAxeForSpecialResource(player)
        if (axe == null) {
            mes("You need an axe which you have the Woodcutting level to use.")
            return
        }
        if (skillAnimDelay <= clock) {
            skillAnimDelay = clock + 4
            animateAxe(axe)
        }
        if (initial) spam("You swing your axe at the infected root.")
        if (actionDelay < clock) {
            actionDelay = clock + 3
        } else if (actionDelay == clock) {
            actionDelay = clock + 4
            // Tears are stackable. Do not block a full inventory containing an existing stack.
            if (invAdd(inv, TEAR, 1).failure) {
                mes("You don't have enough inventory space.")
                resetAnim()
                return
            }
            statAdvance("stat.woodcutting", TEAR_XP * xpMods.get(player, "stat.woodcutting"))
            if (random.of(LOG_CHANCE) == 0 && invAdd(inv, LOGS, 1).success) {
                statAdvance("stat.woodcutting", LOG_XP * xpMods.get(player, "stat.woodcutting"))
            }
            if (getInvObj(axe).internalName in listOf("obj.crystal_axe", "obj.crystal_axe_2h")) {
                WoodcuttingAxes.consume(player, axe)
            }
        }
        // Unlike ordinary trees, the infected root never depletes.
        opLoc3("loc.demon_tear_tree_3x3_op")
    }

    private fun ProtectedAccess.animateAxe(axe: InvObj) {
        val replacement = WoodcuttingAxes.animation(getInvObj(axe).internalName)
        if (replacement != null) {
            anim(replacement)
        } else {
            val seq = WoodcuttingAxes.effectiveType(axe).axeWoodcuttingAnim
            anim(RSCM.getReverseMapping(RSCMType.SEQ, seq.id))
        }
    }

    private companion object {
        const val LEVEL = 80
        const val TEAR = "obj.demon_tear"
        const val LOGS = "obj.logs"
        const val TEAR_XP = 10.0
        const val LOG_XP = 25.0
        // An approximate incidental-log rate; original resource drop rates need verification.
        const val LOG_CHANCE = 7
    }
}
