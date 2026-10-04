// AUTO-GENERATED for dbtable.drakan_spotanims — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DrakanSpotanimsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DrakanSpotanimsRow> by
        lazy { DbHelper.table("dbtable.drakan_spotanims").map { DrakanSpotanimsRow(it) } }

    public fun all(): List<DrakanSpotanimsRow> = cachedAll

    public fun getRow(row: Int): DrakanSpotanimsRow = DrakanSpotanimsRow(DbHelper.row(row))

    public fun getRow(column: String): DrakanSpotanimsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
