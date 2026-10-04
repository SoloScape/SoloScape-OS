// AUTO-GENERATED for dbtable.chartering_costs — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CharteringCostsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CharteringCostsRow> by
        lazy { DbHelper.table("dbtable.chartering_costs").map { CharteringCostsRow(it) } }

    public fun all(): List<CharteringCostsRow> = cachedAll

    public fun getRow(row: Int): CharteringCostsRow = CharteringCostsRow(DbHelper.row(row))

    public fun getRow(column: String): CharteringCostsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
