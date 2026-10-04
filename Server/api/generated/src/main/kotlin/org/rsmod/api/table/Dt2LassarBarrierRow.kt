// AUTO-GENERATED for dbtable.dt2_lassar_barrier — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Dt2LassarBarrierRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Dt2LassarBarrierRow> by
        lazy { DbHelper.table("dbtable.dt2_lassar_barrier").map { Dt2LassarBarrierRow(it) } }

    public fun all(): List<Dt2LassarBarrierRow> = cachedAll

    public fun getRow(row: Int): Dt2LassarBarrierRow = Dt2LassarBarrierRow(DbHelper.row(row))

    public fun getRow(column: String): Dt2LassarBarrierRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
