// AUTO-GENERATED for dbtable.fishing_spot_def — do not edit.
package org.rsmod.api.table.fishing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class FishingSpotDefRow(
  row: DbHelper,
) {
  public val spotId: Int = row.int("dbcol.fishing_spot_def:spot_id")

  public val content: String = row.string("dbcol.fishing_spot_def:content")

  public val op1: Int = row.int("dbcol.fishing_spot_def:op1")

  public val op3: Int = row.int("dbcol.fishing_spot_def:op3")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FishingSpotDefRow> by
        lazy { DbHelper.table("dbtable.fishing_spot_def").map { FishingSpotDefRow(it) } }

    public fun all(): List<FishingSpotDefRow> = cachedAll

    public fun getRow(row: Int): FishingSpotDefRow = FishingSpotDefRow(DbHelper.row(row))

    public fun getRow(column: String): FishingSpotDefRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
