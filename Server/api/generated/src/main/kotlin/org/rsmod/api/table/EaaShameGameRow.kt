// AUTO-GENERATED for dbtable.eaa_shame_game — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class EaaShameGameRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<EaaShameGameRow> by
        lazy { DbHelper.table("dbtable.eaa_shame_game").map { EaaShameGameRow(it) } }

    public fun all(): List<EaaShameGameRow> = cachedAll

    public fun getRow(row: Int): EaaShameGameRow = EaaShameGameRow(DbHelper.row(row))

    public fun getRow(column: String): EaaShameGameRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
