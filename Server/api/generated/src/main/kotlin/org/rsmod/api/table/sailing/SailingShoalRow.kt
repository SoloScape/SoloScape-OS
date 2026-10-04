// AUTO-GENERATED for dbtable.sailing_shoal — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingShoalRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingShoalRow> by
        lazy { DbHelper.table("dbtable.sailing_shoal").map { SailingShoalRow(it) } }

    public fun all(): List<SailingShoalRow> = cachedAll

    public fun getRow(row: Int): SailingShoalRow = SailingShoalRow(DbHelper.row(row))

    public fun getRow(column: String): SailingShoalRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
