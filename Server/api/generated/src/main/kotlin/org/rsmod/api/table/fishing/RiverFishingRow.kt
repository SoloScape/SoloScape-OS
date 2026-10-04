// AUTO-GENERATED for dbtable.river_fishing — do not edit.
package org.rsmod.api.table.fishing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class RiverFishingRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<RiverFishingRow> by
        lazy { DbHelper.table("dbtable.river_fishing").map { RiverFishingRow(it) } }

    public fun all(): List<RiverFishingRow> = cachedAll

    public fun getRow(row: Int): RiverFishingRow = RiverFishingRow(DbHelper.row(row))

    public fun getRow(column: String): RiverFishingRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
