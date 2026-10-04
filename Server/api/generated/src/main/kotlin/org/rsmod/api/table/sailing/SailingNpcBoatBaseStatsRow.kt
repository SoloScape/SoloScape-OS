// AUTO-GENERATED for dbtable.sailing_npc_boat_base_stats — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingNpcBoatBaseStatsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingNpcBoatBaseStatsRow> by
        lazy { DbHelper.table("dbtable.sailing_npc_boat_base_stats").map { SailingNpcBoatBaseStatsRow(it) } }

    public fun all(): List<SailingNpcBoatBaseStatsRow> = cachedAll

    public fun getRow(row: Int): SailingNpcBoatBaseStatsRow = SailingNpcBoatBaseStatsRow(DbHelper.row(row))

    public fun getRow(column: String): SailingNpcBoatBaseStatsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
