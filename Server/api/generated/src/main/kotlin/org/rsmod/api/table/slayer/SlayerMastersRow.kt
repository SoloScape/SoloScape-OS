// AUTO-GENERATED for dbtable.slayer_masters — do not edit.
package org.rsmod.api.table.slayer

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.NpcServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SlayerMastersRow(
  row: DbHelper,
) {
  public val masterId: Int = row.int("dbcol.slayer_masters:master_id")

  public val npcIds: List<NpcServerType> =
      row.list("dbcol.slayer_masters:npc_ids", DbColumnCodec.NpcTypeCodec)

  public val slayerLevel: Int = row.int("dbcol.slayer_masters:slayer_level")

  public val combatLevel: Int = row.int("dbcol.slayer_masters:combat_level")

  public val pointsPerTask: Int = row.int("dbcol.slayer_masters:points_per_task")

  public val blockVarbits: List<Int> =
      row.list("dbcol.slayer_masters:block_varbits", DbColumnCodec.IntCodec)

  public val assignBosses: Boolean = row.boolean("dbcol.slayer_masters:assign_bosses")

  public val blockCost: Int = row.int("dbcol.slayer_masters:block_cost")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SlayerMastersRow> by
        lazy { DbHelper.table("dbtable.slayer_masters").map { SlayerMastersRow(it) } }

    public fun all(): List<SlayerMastersRow> = cachedAll

    public fun getRow(row: Int): SlayerMastersRow = SlayerMastersRow(DbHelper.row(row))

    public fun getRow(column: String): SlayerMastersRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
