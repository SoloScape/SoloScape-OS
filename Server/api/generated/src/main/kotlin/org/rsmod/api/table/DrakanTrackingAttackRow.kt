// AUTO-GENERATED for dbtable.drakan_tracking_attack — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DrakanTrackingAttackRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DrakanTrackingAttackRow> by
        lazy { DbHelper.table("dbtable.drakan_tracking_attack").map { DrakanTrackingAttackRow(it) } }

    public fun all(): List<DrakanTrackingAttackRow> = cachedAll

    public fun getRow(row: Int): DrakanTrackingAttackRow = DrakanTrackingAttackRow(DbHelper.row(row))

    public fun getRow(column: String): DrakanTrackingAttackRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
