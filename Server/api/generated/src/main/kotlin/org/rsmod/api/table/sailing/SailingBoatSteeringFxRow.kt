// AUTO-GENERATED for dbtable.sailing_boat_steering_fx — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingBoatSteeringFxRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatSteeringFxRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_steering_fx").map { SailingBoatSteeringFxRow(it) } }

    public fun all(): List<SailingBoatSteeringFxRow> = cachedAll

    public fun getRow(row: Int): SailingBoatSteeringFxRow = SailingBoatSteeringFxRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatSteeringFxRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
