// AUTO-GENERATED for dbtable.gathering_event_events_list — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class GatheringEventEventsListRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<GatheringEventEventsListRow> by
        lazy { DbHelper.table("dbtable.gathering_event_events_list").map { GatheringEventEventsListRow(it) } }

    public fun all(): List<GatheringEventEventsListRow> = cachedAll

    public fun getRow(row: Int): GatheringEventEventsListRow = GatheringEventEventsListRow(DbHelper.row(row))

    public fun getRow(column: String): GatheringEventEventsListRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
