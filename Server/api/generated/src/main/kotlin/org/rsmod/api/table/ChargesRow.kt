// AUTO-GENERATED for dbtable.charges — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class ChargesRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ChargesRow> by
        lazy { DbHelper.table("dbtable.charges").map { ChargesRow(it) } }

    public fun all(): List<ChargesRow> = cachedAll

    public fun getRow(row: Int): ChargesRow = ChargesRow(DbHelper.row(row))

    public fun getRow(column: String): ChargesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
