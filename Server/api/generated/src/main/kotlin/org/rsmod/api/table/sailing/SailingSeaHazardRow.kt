// AUTO-GENERATED for dbtable.sailing_sea_hazard — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingSeaHazardRow(
  row: DbHelper,
) {
  public val hazardId: Int = row.int("dbcol.sailing_sea_hazard:hazard_id")

  public val name: String = row.string("dbcol.sailing_sea_hazard:name")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingSeaHazardRow> by
        lazy { DbHelper.table("dbtable.sailing_sea_hazard").map { SailingSeaHazardRow(it) } }

    public fun all(): List<SailingSeaHazardRow> = cachedAll

    public fun getRow(row: Int): SailingSeaHazardRow = SailingSeaHazardRow(DbHelper.row(row))

    public fun getRow(column: String): SailingSeaHazardRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
