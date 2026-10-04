// AUTO-GENERATED for dbtable.woodcutting_resource — do not edit.
package org.rsmod.api.table.woodcutting

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class WoodcuttingResourceRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<WoodcuttingResourceRow> by
        lazy { DbHelper.table("dbtable.woodcutting_resource").map { WoodcuttingResourceRow(it) } }

    public fun all(): List<WoodcuttingResourceRow> = cachedAll

    public fun getRow(row: Int): WoodcuttingResourceRow = WoodcuttingResourceRow(DbHelper.row(row))

    public fun getRow(column: String): WoodcuttingResourceRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
