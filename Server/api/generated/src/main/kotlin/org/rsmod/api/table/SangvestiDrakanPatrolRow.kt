// AUTO-GENERATED for dbtable.sangvesti_drakan_patrol — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SangvestiDrakanPatrolRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SangvestiDrakanPatrolRow> by
        lazy { DbHelper.table("dbtable.sangvesti_drakan_patrol").map { SangvestiDrakanPatrolRow(it) } }

    public fun all(): List<SangvestiDrakanPatrolRow> = cachedAll

    public fun getRow(row: Int): SangvestiDrakanPatrolRow = SangvestiDrakanPatrolRow(DbHelper.row(row))

    public fun getRow(column: String): SangvestiDrakanPatrolRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
