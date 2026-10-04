// AUTO-GENERATED for dbtable.events — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class EventsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<EventsRow> by
        lazy { DbHelper.table("dbtable.events").map { EventsRow(it) } }

    public fun all(): List<EventsRow> = cachedAll

    public fun getRow(row: Int): EventsRow = EventsRow(DbHelper.row(row))

    public fun getRow(column: String): EventsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
