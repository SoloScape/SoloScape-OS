// AUTO-GENERATED for dbtable.gathering_event_chance_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class GatheringEventChanceDataRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<GatheringEventChanceDataRow> by
        lazy { DbHelper.table("dbtable.gathering_event_chance_data").map { GatheringEventChanceDataRow(it) } }

    public fun all(): List<GatheringEventChanceDataRow> = cachedAll

    public fun getRow(row: Int): GatheringEventChanceDataRow = GatheringEventChanceDataRow(DbHelper.row(row))

    public fun getRow(column: String): GatheringEventChanceDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
