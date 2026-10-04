// AUTO-GENERATED for dbtable.thieving_chest — do not edit.
package org.rsmod.api.table.thieving

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class ThievingChestRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ThievingChestRow> by
        lazy { DbHelper.table("dbtable.thieving_chest").map { ThievingChestRow(it) } }

    public fun all(): List<ThievingChestRow> = cachedAll

    public fun getRow(row: Int): ThievingChestRow = ThievingChestRow(DbHelper.row(row))

    public fun getRow(column: String): ThievingChestRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
