// AUTO-GENERATED for dbtable.drakan_tile_attack — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DrakanTileAttackRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DrakanTileAttackRow> by
        lazy { DbHelper.table("dbtable.drakan_tile_attack").map { DrakanTileAttackRow(it) } }

    public fun all(): List<DrakanTileAttackRow> = cachedAll

    public fun getRow(row: Int): DrakanTileAttackRow = DrakanTileAttackRow(DbHelper.row(row))

    public fun getRow(column: String): DrakanTileAttackRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
