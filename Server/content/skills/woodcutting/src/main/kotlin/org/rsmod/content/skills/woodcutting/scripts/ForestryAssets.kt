package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCMType

internal object ForestryAssets {
    const val ROOT = "loc.gathering_event_rising_roots"
    const val INFUSED_ROOT = "loc.gathering_event_rising_roots_special"
    // Native Forestry scenery animations (seven 600ms game cycles each in revision 240).
    const val ROOT_RISE_ANIM = "seq.forestry_rising_roots_spawn"
    const val ROOT_SINK_ANIM = "seq.forestry_rising_roots_despawn"
    const val ROOT_ANIM_TICKS = 7

    fun rootAnimationsAvailable(): Boolean = listOf(ROOT_RISE_ANIM, ROOT_SINK_ANIM).all {
        val id = RSCM.getRSCMOrNull(it, RSCMType.SEQ)
        id != null && ServerCacheManager.getAnim(id) != null
    }
    const val SAPLING = "loc.gathering_event_sapling_1x1"
    const val THRIVING_SAPLING = "loc.gathering_event_sapling_saved_1x1"
    const val RAINBOW = "loc.gathering_event_woodcutting_leprechaun_rainbow"
    const val NEST = "loc.gathering_event_pheasant_nest01"
    const val EMPTY_NEST = "loc.gathering_event_pheasant_nest02"
    const val EGG = "obj.gathering_event_pheasant_egg01"
    const val ENTLING = "npc.gathering_event_entlings_npc_01"
    const val PRUNED_ENTLING = "npc.gathering_event_entlings_npc_01_pruned"
    const val LEPRECHAUN = "npc.gathering_event_woodcutting_leprechaun"
    const val KEEPER = "npc.gathering_event_bees_beekeeper"
    const val HIVE = "npc.gathering_event_bees_beebox_1"
    // Verified OSRS NPC IDs: unfinished=12515, halfway=12516, complete=12517.
    // Resolve by native IDs so a different name in the cache cannot switch stages.
    private const val HIVE_HALF_ID = 12516
    private const val HIVE_COMPLETE_ID = 12517
    const val FOX = "npc.gathering_event_poachers_fox_outdoors"
    const val POACHER = "npc.gathering_event_poachers_poacher01_outdoors"
    const val TRAP = "npc.gathering_event_poachers_trap"
    const val DRYAD = "npc.gathering_event_enchanted_ritual_dryad"
    const val FORESTER = "npc.gathering_event_pheasant_forester"
    const val PHEASANT = "npc.gathering_event_pheasant"
    val ingredients = listOf(3, 2, 1, 5, 4).map {
        "loc.gathering_event_sapling_ingredient_" + it + if (it == 4) "a" else ""
    }
    val mulch = (1..3).map { "obj.gathering_event_sapling_mulch_stage$it" }
    val bushes = (1..8).map { "npc.gathering_event_flowering_tree_bush_col0$it" }
    val circles = ('a'..'d').flatMap { shape ->
        (1..4).map { colour -> "npc.gathering_event_enchanted_ritual_${shape}_$colour" }
    }
    val locNames = listOf(ROOT, INFUSED_ROOT, SAPLING, THRIVING_SAPLING, RAINBOW,
        NEST, EMPTY_NEST) + ingredients
    val npcNames = listOf(ENTLING, PRUNED_ENTLING, LEPRECHAUN, KEEPER, HIVE, FOX,
        POACHER, TRAP, DRYAD, FORESTER, PHEASANT) + bushes + circles

    /**
     * Native SkillMulti requires an inventory item graphic, not an NPC model.
     * Prefer an item actually called Beehive; otherwise use the native sturdy
     * beehive parts sprite, and fall back to a logs graphic if neither exists.
     */
    fun hiveMenuItem(): String = ServerCacheManager.getItems().values.firstOrNull {
        it.name.equals("Beehive", ignoreCase = true)
    }?.internalName ?: ServerCacheManager.getItems().values.firstOrNull {
        it.name.equals("Sturdy beehive parts", ignoreCase = true)
    }?.internalName ?: "obj.logs"

    fun hiveHalf() = ServerCacheManager.getNpcs().values.firstOrNull { it.id == HIVE_HALF_ID }
    fun hiveComplete() = ServerCacheManager.getNpcs().values.firstOrNull { it.id == HIVE_COMPLETE_ID }

    // Decorative assets are optional, but they must be the actual gameval bees
    // and wild hive, never a substitute NPC with unrelated interactions.
    // The OSRS friendly-bees NPC is 12168; it is shared with other Forestry
    // scenery, so its gameval prefix is not necessarily gathering_event_bees.
    fun friendlyBees() = ServerCacheManager.getNpcs().values.firstOrNull {
        it.id == 12168 && it.name.contains("Friendly Bees", ignoreCase = true)
    }
    fun wildHive() = ServerCacheManager.getNpcs().values.firstOrNull {
        it.internalName.startsWith("npc.gathering_event_bees_") &&
            it.name.contains("Wild Beehive", ignoreCase = true)
    }
    fun wildHiveLoc() = ServerCacheManager.getObjects().values.firstOrNull {
        it.internalName.startsWith("loc.gathering_event_bees_") &&
            it.name.contains("Wild Beehive", ignoreCase = true)
    }

    fun loc(symbol: String) = ServerCacheManager.getObjects().values.firstOrNull {
        it.internalName == symbol
    }
    fun npc(symbol: String) = ServerCacheManager.getNpcs().values.firstOrNull {
        it.internalName == symbol
    }
}
