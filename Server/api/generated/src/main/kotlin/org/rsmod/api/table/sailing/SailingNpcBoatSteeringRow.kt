// AUTO-GENERATED for dbtable.sailing_npc_boat_steering — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingNpcBoatSteeringRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingNpcBoatSteeringRow> by
        lazy { DbHelper.table("dbtable.sailing_npc_boat_steering").map { SailingNpcBoatSteeringRow(it) } }

    public fun all(): List<SailingNpcBoatSteeringRow> = cachedAll

    public fun getRow(row: Int): SailingNpcBoatSteeringRow = SailingNpcBoatSteeringRow(DbHelper.row(row))

    public fun getRow(column: String): SailingNpcBoatSteeringRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
