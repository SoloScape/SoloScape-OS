// AUTO-GENERATED for dbtable.poh_hotspot — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.FurnitureRow

public class PohHotspotRow(
  row: DbHelper,
) {
  public val builddata: List<FurnitureRow> by
      lazy { row.slotsOptional("dbcol.poh_hotspot:builddata", DbColumnCodec.DbRowTypeCodec).map { FurnitureRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PohHotspotRow> by
        lazy { DbHelper.table("dbtable.poh_hotspot").map { PohHotspotRow(it) } }

    public fun all(): List<PohHotspotRow> = cachedAll

    public fun getRow(row: Int): PohHotspotRow = PohHotspotRow(DbHelper.row(row))

    public fun getRow(column: String): PohHotspotRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
