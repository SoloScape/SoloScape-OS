package org.rsmod.content.skills.construction

import dev.openrune.OsrsCacheProvider
import dev.openrune.ServerCacheManager
import dev.openrune.cache.filestore.definition.ModelDecoder
import dev.openrune.definition.type.ObjectType
import dev.openrune.filesystem.Cache
import dev.openrune.rscm.RSCM.asRSCM
import java.nio.file.Paths
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.parallel.ResourceLock
import org.rsmod.content.skills.construction.data.HouseStyle
import org.rsmod.game.loc.LocEntity
import org.rsmod.game.loc.LocInfo
import org.rsmod.map.CoordGrid

@ResourceLock("ServerCacheManager")
class HouseDoorModelsTest {
    @Test
    fun `cached door meshes stay attached to their outer jamb when opened`() {
        ServerCacheManager.init(240).close()
        val cache = Cache.load(Paths.get(".data/cache/LIVE"))
        try {
            val objects = mutableMapOf<Int, ObjectType>()
            OsrsCacheProvider.ObjectDecoder(240).load(cache, objects)
            val models = ModelDecoder(cache)
            for (style in HouseStyle.entries) for (left in listOf(true, false)) {
                val types = houseDoorTypes(style)
                val closedId = (if (left) types.left else types.right).asRSCM()
                val openedId = (if (left) types.leftOpen else types.rightOpen).asRSCM()
                val closedType = checkNotNull(objects[closedId])
                val openedType = checkNotNull(objects[openedId])
                assertEquals(closedType.objectModels, openedType.objectModels)
                assertEquals(closedType.isRotated, openedType.isRotated)
                val index = checkNotNull(closedType.objectTypes).indexOf(0)
                val mesh = checkNotNull(models.getModel(checkNotNull(closedType.objectModels)[index]))
                val xs = checkNotNull(mesh.vertexPositionsX)
                val zs = checkNotNull(mesh.vertexPositionsZ)
                for (angle in 0..3) {
                    val closed = LocInfo(0, CoordGrid(3, 3), LocEntity(closedId, 0, angle))
                    val opened = houseDoorDestination(closed, types, left, true)
                    val jamb = turn(-64, if (left) 64 else -64, angle)
                    val jambX = closed.coords.x * 128 + 64 + jamb.first
                    val jambZ = closed.coords.z * 128 + 64 + jamb.second
                    for ((panel, type) in listOf(closed to closedType, opened to openedType)) {
                        val distance = xs.indices.minOf { vertex ->
                            val z = if (type.isRotated) -zs[vertex] else zs[vertex]
                            val point = turn(xs[vertex], z, panel.angleId)
                            val dx = panel.coords.x * 128 + 64 + point.first + type.offsetX - jambX
                            val dz = panel.coords.z * 128 + 64 + point.second + type.offsetZ - jambZ
                            dx * dx + dz * dz
                        }
                        assertTrue(distance <= 16 * 16,
                            "$style left=$left angle=$angle panel=${panel.id} detached from jamb: distanceSquared=$distance")
                    }
                }
            }
        } finally {
            cache.close()
        }
    }

    private fun turn(x: Int, z: Int, angle: Int): Pair<Int, Int> = when (angle) {
        0 -> x to z
        1 -> z to -x
        2 -> -x to -z
        else -> -z to x
    }
}
