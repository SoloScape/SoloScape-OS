// AUTO-GENERATED for dbtable.dt2_lassar_braziers — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Dt2LassarBraziersRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Dt2LassarBraziersRow> by
        lazy { DbHelper.table("dbtable.dt2_lassar_braziers").map { Dt2LassarBraziersRow(it) } }

    public fun all(): List<Dt2LassarBraziersRow> = cachedAll

    public fun getRow(row: Int): Dt2LassarBraziersRow = Dt2LassarBraziersRow(DbHelper.row(row))

    public fun getRow(column: String): Dt2LassarBraziersRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
