// AUTO-GENERATED for dbtable.dt2_lassar_ghosts — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Dt2LassarGhostsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Dt2LassarGhostsRow> by
        lazy { DbHelper.table("dbtable.dt2_lassar_ghosts").map { Dt2LassarGhostsRow(it) } }

    public fun all(): List<Dt2LassarGhostsRow> = cachedAll

    public fun getRow(row: Int): Dt2LassarGhostsRow = Dt2LassarGhostsRow(DbHelper.row(row))

    public fun getRow(column: String): Dt2LassarGhostsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
