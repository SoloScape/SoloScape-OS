// AUTO-GENERATED for dbtable.castle_drakan_stairs — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CastleDrakanStairsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CastleDrakanStairsRow> by
        lazy { DbHelper.table("dbtable.castle_drakan_stairs").map { CastleDrakanStairsRow(it) } }

    public fun all(): List<CastleDrakanStairsRow> = cachedAll

    public fun getRow(row: Int): CastleDrakanStairsRow = CastleDrakanStairsRow(DbHelper.row(row))

    public fun getRow(column: String): CastleDrakanStairsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
