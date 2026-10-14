package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager

fun main() {
    ServerCacheManager.init(240)
    runWoodcuttingAxeTests()
}
