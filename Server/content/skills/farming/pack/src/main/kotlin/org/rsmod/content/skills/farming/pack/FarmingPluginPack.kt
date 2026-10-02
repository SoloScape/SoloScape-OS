package org.rsmod.content.skills.farming.pack

import dev.openrune.cache.filestore.definition.InterfaceType
import dev.openrune.definition.dbtables.DBTable
import dev.openrune.pack.PluginPack

class FarmingPluginPack : PluginPack() {
    override fun interfaces(): List<InterfaceType> = listOf(buildFarmingToolStoreInterface())
    override fun dbTables(): List<DBTable> =
        listOf(FarmingTables.crops(), FarmingTables.patches())
}
