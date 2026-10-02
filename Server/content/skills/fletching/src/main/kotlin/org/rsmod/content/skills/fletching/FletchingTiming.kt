package org.rsmod.content.skills.fletching

internal fun fletchingCycleTicks(recipe: FletchingRecipe, hasFletchingKnife: Boolean): Int {
    val speedup = hasFletchingKnife && recipe.tool == KNIFE && recipe.output !in KNIFE_EXCLUSIONS
    return if (speedup && recipe.ticks >= 2) recipe.ticks - 1 else recipe.ticks
}

private val KNIFE_EXCLUSIONS = setOf(
    "obj.camphor_blowpipe_empty",
    "obj.ironwood_blowpipe_empty",
    "obj.rosewood_blowpipe_empty",
    "obj.blisterwood_stake",
    "obj.blisterwood_sickle",
    "obj.blisterwood_sickle_enhanced",
    "obj.brew_scrapey_bark",
)
