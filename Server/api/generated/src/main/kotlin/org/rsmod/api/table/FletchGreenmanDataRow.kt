// AUTO-GENERATED for dbtable.fletch_greenman_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class FletchGreenmanDataRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FletchGreenmanDataRow> by
        lazy { DbHelper.table("dbtable.fletch_greenman_data").map { FletchGreenmanDataRow(it) } }

    public fun all(): List<FletchGreenmanDataRow> = cachedAll

    public fun getRow(row: Int): FletchGreenmanDataRow = FletchGreenmanDataRow(DbHelper.row(row))

    public fun getRow(column: String): FletchGreenmanDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
