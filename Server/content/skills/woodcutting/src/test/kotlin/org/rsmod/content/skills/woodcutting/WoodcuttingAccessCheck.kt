package org.rsmod.content.skills.woodcutting

import dev.openrune.ServerCacheManager
import dev.openrune.cache.MAPS
import dev.openrune.map.loc.MapLocDefinition
import dev.openrune.map.loc.MapLocListDecoder
import dev.openrune.map.util.InlineByteBuf
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType

/** Read-only cache evidence for the unresolved quest access routes in issue #46. */
fun main() {
    val cache = ServerCacheManager.init(240)
    try {
        val symbols = (1..6).map { "loc.bloodwood_tree$it" } +
            listOf("loc.afk_bloodwood_tree", "loc.myq6_vampyrium_portal",
                "loc.demon_tear_tree_3x3")
        val types = symbols.associateWith {
            checkNotNull(ServerCacheManager.getObject(it.asRSCM())) { "Missing asset: $it" }
        }
        val portal = types.getValue("loc.myq6_vampyrium_portal")
        check(portal.transforms?.first() == -1) { "Portal unexpectedly visible at stage zero" }
        check("loc.myq6_vampyrium_portal_vis".asRSCM() in portal.multiLoc)
        val root = types.getValue("loc.demon_tear_tree_3x3")
        check(root.transforms?.first() != "loc.demon_tear_tree_3x3_op".asRSCM())
        check(root.multiDefault == "loc.demon_tear_tree_3x3_op".asRSCM())
        for ((symbol, type) in types) {
            val variable = if (type.multiVarBit >= 0) {
                RSCM.getReverseMapping(RSCMType.VARBIT, type.multiVarBit)
            } else "none"
            println("ASSET $symbol stage=$variable transformCount=${type.multiLoc.size} " +
                "initial=${type.multiLoc.firstOrNull()} default=${type.multiDefault}")
        }
        val byId = types.values.associateBy { it.id }
        val found = mutableSetOf<Int>()
        val undecoded = mutableListOf<Int>()
        for (group in cache.archives(MAPS)) {
            val bytes = cache.data(MAPS, group, 1) ?: continue
            val locs = try {
                MapLocListDecoder.decode(InlineByteBuf(bytes))
            } catch (_: IndexOutOfBoundsException) {
                undecoded += group
                continue
            }
            for (packed in locs.spawns.toLongArray()) {
                val loc = MapLocDefinition(packed)
                val type = byId[loc.id] ?: continue
                found += loc.id
                val x = (group shr 8) * 64 + loc.localX
                val z = (group and 255) * 64 + loc.localZ
                println("PLACEMENT ${type.internalName} group=$group x=$x z=$z level=${loc.level}")
            }
        }
        check(found.containsAll(byId.keys)) { "No decoded native placement: ${byId.keys - found}" }
        println("Undecoded map groups: $undecoded")
        println("Native assets and placements verified; quest routes and gameplay remain unverified.")
    } finally {
        cache.close()
    }
}
