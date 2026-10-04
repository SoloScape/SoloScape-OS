// AUTO-GENERATED for dbtable.gathering_event_sapling_loc — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class GatheringEventSaplingLocRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<GatheringEventSaplingLocRow> by
        lazy { DbHelper.table("dbtable.gathering_event_sapling_loc").map { GatheringEventSaplingLocRow(it) } }

    public fun all(): List<GatheringEventSaplingLocRow> = cachedAll

    public fun getRow(row: Int): GatheringEventSaplingLocRow = GatheringEventSaplingLocRow(DbHelper.row(row))

    public fun getRow(column: String): GatheringEventSaplingLocRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
