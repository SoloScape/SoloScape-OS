// AUTO-GENERATED for dbtable.motherlode_paydirt — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class MotherlodePaydirtRow(
  row: DbHelper,
) {
  public val key: String = row.string("dbcol.motherlode_paydirt:key")

  public val oreItem: ItemServerType = row.obj("dbcol.motherlode_paydirt:ore_item")

  public val level: Int = row.int("dbcol.motherlode_paydirt:level")

  public val xp: Int = row.int("dbcol.motherlode_paydirt:xp")

  public val successRateLow: Int = row.int("dbcol.motherlode_paydirt:success_rate_low")

  public val successRateHigh: Int = row.int("dbcol.motherlode_paydirt:success_rate_high")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<MotherlodePaydirtRow> by
        lazy { DbHelper.table("dbtable.motherlode_paydirt").map { MotherlodePaydirtRow(it) } }

    public fun all(): List<MotherlodePaydirtRow> = cachedAll

    public fun getRow(row: Int): MotherlodePaydirtRow = MotherlodePaydirtRow(DbHelper.row(row))

    public fun getRow(column: String): MotherlodePaydirtRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
