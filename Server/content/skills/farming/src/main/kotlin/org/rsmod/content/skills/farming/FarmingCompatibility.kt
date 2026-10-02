package org.rsmod.content.skills.farming

import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.content.skills.farming.data.Crops
import org.rsmod.content.skills.farming.data.FarmingPatch
import org.rsmod.content.skills.farming.state.Compost as ExtendedCompost
import org.rsmod.content.skills.farming.state.PatchState as ExtendedPatchState
import org.rsmod.game.entity.Player

object FarmingCompatibility {
    private fun managed(patch: FarmingPatch): PatchDef? =
        FarmingPatches.all.firstOrNull { it.loc == patch.loc }

    fun state(player: Player, patch: FarmingPatch): ExtendedPatchState? {
        val managed = managed(patch) ?: return null
        val state = PatchState.unpack(player.vars[managed.varp])
        return ExtendedPatchState(
            cropKey = state.crop?.let { Crops.forSeed(it.seed)?.key },
            stage = state.stage,
            weeds = state.weeds,
            diseased = state.health == Health.DISEASED,
            dead = state.health == Health.DEAD,
            watered = state.watered,
            compost = ExtendedCompost.entries[state.compost.ordinal],
            protectedByFarmer = state.protectedByFarmer,
            lives = state.produce,
        )
    }

    fun update(player: Player, patch: FarmingPatch, block: (ExtendedPatchState) -> Unit): Boolean {
        val managed = managed(patch) ?: return false
        val original = PatchState.unpack(player.vars[managed.varp])
        val state = state(player, patch) ?: return false
        block(state)
        val crop = state.crop?.let { FarmingCrops.bySeed(it.seed) }
        val updated = original.copy(
            cropIndex = crop?.let(FarmingCrops::index) ?: 0,
            stage = state.stage,
            weeds = state.weeds,
            health = when {
                state.dead -> Health.DEAD
                state.diseased -> Health.DISEASED
                else -> Health.HEALTHY
            },
            watered = state.watered,
            compost = Compost.entries[state.compost.ordinal],
            protectedByFarmer = state.protectedByFarmer,
            produce = state.lives,
        )
        VarPlayerIntMapSetter.set(player, managed.varp, updated.pack())
        return true
    }
}
