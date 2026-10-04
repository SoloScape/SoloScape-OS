// AUTO-GENERATED for dbtable.dt2_lassar_chest — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Dt2LassarChestRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Dt2LassarChestRow> by
        lazy { DbHelper.table("dbtable.dt2_lassar_chest").map { Dt2LassarChestRow(it) } }

    public fun all(): List<Dt2LassarChestRow> = cachedAll

    public fun getRow(row: Int): Dt2LassarChestRow = Dt2LassarChestRow(DbHelper.row(row))

    public fun getRow(column: String): Dt2LassarChestRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
