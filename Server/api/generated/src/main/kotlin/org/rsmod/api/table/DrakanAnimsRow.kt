// AUTO-GENERATED for dbtable.drakan_anims — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DrakanAnimsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DrakanAnimsRow> by
        lazy { DbHelper.table("dbtable.drakan_anims").map { DrakanAnimsRow(it) } }

    public fun all(): List<DrakanAnimsRow> = cachedAll

    public fun getRow(row: Int): DrakanAnimsRow = DrakanAnimsRow(DbHelper.row(row))

    public fun getRow(column: String): DrakanAnimsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
