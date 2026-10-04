// AUTO-GENERATED for dbtable.drakan_visuals — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DrakanVisualsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DrakanVisualsRow> by
        lazy { DbHelper.table("dbtable.drakan_visuals").map { DrakanVisualsRow(it) } }

    public fun all(): List<DrakanVisualsRow> = cachedAll

    public fun getRow(row: Int): DrakanVisualsRow = DrakanVisualsRow(DbHelper.row(row))

    public fun getRow(column: String): DrakanVisualsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
