// AUTO-GENERATED for dbtable.sailing_boat_hotspot — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.list
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.sailing.SailingBoatFacilityRow

public class SailingBoatHotspotRow(
  row: DbHelper,
) {
  public val option: List<SailingBoatFacilityRow> by
      lazy { row.list("dbcol.sailing_boat_hotspot:option", DbColumnCodec.DbRowTypeCodec).map { SailingBoatFacilityRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatHotspotRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_hotspot").map { SailingBoatHotspotRow(it) } }

    public fun all(): List<SailingBoatHotspotRow> = cachedAll

    public fun getRow(row: Int): SailingBoatHotspotRow = SailingBoatHotspotRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatHotspotRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
