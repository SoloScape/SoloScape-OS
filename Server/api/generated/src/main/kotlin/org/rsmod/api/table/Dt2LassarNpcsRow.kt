// AUTO-GENERATED for dbtable.dt2_lassar_npcs — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Dt2LassarNpcsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Dt2LassarNpcsRow> by
        lazy { DbHelper.table("dbtable.dt2_lassar_npcs").map { Dt2LassarNpcsRow(it) } }

    public fun all(): List<Dt2LassarNpcsRow> = cachedAll

    public fun getRow(row: Int): Dt2LassarNpcsRow = Dt2LassarNpcsRow(DbHelper.row(row))

    public fun getRow(column: String): Dt2LassarNpcsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
