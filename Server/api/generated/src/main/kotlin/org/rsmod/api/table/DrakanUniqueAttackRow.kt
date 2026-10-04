// AUTO-GENERATED for dbtable.drakan_unique_attack — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DrakanUniqueAttackRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DrakanUniqueAttackRow> by
        lazy { DbHelper.table("dbtable.drakan_unique_attack").map { DrakanUniqueAttackRow(it) } }

    public fun all(): List<DrakanUniqueAttackRow> = cachedAll

    public fun getRow(row: Int): DrakanUniqueAttackRow = DrakanUniqueAttackRow(DbHelper.row(row))

    public fun getRow(column: String): DrakanUniqueAttackRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
