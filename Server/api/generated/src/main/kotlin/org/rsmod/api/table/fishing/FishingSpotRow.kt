// AUTO-GENERATED for dbtable.fishing_spot — do not edit.
package org.rsmod.api.table.fishing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class FishingSpotRow(
  row: DbHelper,
) {
  public val fish: ItemServerType = row.obj("dbcol.fishing_spot:fish")

  public val spot: Int = row.int("dbcol.fishing_spot:spot")

  public val method: Int = row.int("dbcol.fishing_spot:method")

  public val level: Int = row.int("dbcol.fishing_spot:level")

  public val xp: Int = row.int("dbcol.fishing_spot:xp")

  public val low: Int = row.int("dbcol.fishing_spot:low")

  public val high: Int = row.int("dbcol.fishing_spot:high")

  public val strXp: Int = row.int("dbcol.fishing_spot:str_xp")

  public val agiXp: Int = row.int("dbcol.fishing_spot:agi_xp")

  public val count: Int = row.int("dbcol.fishing_spot:count")

  public val strReq: Int = row.int("dbcol.fishing_spot:str_req")

  public val agiReq: Int = row.int("dbcol.fishing_spot:agi_req")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FishingSpotRow> by
        lazy { DbHelper.table("dbtable.fishing_spot").map { FishingSpotRow(it) } }

    public fun all(): List<FishingSpotRow> = cachedAll

    public fun getRow(row: Int): FishingSpotRow = FishingSpotRow(DbHelper.row(row))

    public fun getRow(column: String): FishingSpotRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
