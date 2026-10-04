// AUTO-GENERATED for dbtable.coordinate_set — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CoordinateSetRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CoordinateSetRow> by
        lazy { DbHelper.table("dbtable.coordinate_set").map { CoordinateSetRow(it) } }

    public fun all(): List<CoordinateSetRow> = cachedAll

    public fun getRow(row: Int): CoordinateSetRow = CoordinateSetRow(DbHelper.row(row))

    public fun getRow(column: String): CoordinateSetRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
