// AUTO-GENERATED for dbtable.dt2_lassar_remnant — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Dt2LassarRemnantRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Dt2LassarRemnantRow> by
        lazy { DbHelper.table("dbtable.dt2_lassar_remnant").map { Dt2LassarRemnantRow(it) } }

    public fun all(): List<Dt2LassarRemnantRow> = cachedAll

    public fun getRow(row: Int): Dt2LassarRemnantRow = Dt2LassarRemnantRow(DbHelper.row(row))

    public fun getRow(column: String): Dt2LassarRemnantRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
