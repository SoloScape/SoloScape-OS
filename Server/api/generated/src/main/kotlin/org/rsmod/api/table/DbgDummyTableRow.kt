// AUTO-GENERATED for dbtable.dbg_dummy_table — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DbgDummyTableRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DbgDummyTableRow> by
        lazy { DbHelper.table("dbtable.dbg_dummy_table").map { DbgDummyTableRow(it) } }

    public fun all(): List<DbgDummyTableRow> = cachedAll

    public fun getRow(row: Int): DbgDummyTableRow = DbgDummyTableRow(DbHelper.row(row))

    public fun getRow(column: String): DbgDummyTableRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
