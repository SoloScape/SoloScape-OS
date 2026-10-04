// AUTO-GENERATED for dbtable.dt2_lassar_items — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Dt2LassarItemsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Dt2LassarItemsRow> by
        lazy { DbHelper.table("dbtable.dt2_lassar_items").map { Dt2LassarItemsRow(it) } }

    public fun all(): List<Dt2LassarItemsRow> = cachedAll

    public fun getRow(row: Int): Dt2LassarItemsRow = Dt2LassarItemsRow(DbHelper.row(row))

    public fun getRow(column: String): Dt2LassarItemsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
