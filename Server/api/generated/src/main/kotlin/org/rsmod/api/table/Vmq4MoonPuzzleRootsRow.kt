// AUTO-GENERATED for dbtable.vmq4_moon_puzzle_roots — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Vmq4MoonPuzzleRootsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Vmq4MoonPuzzleRootsRow> by
        lazy { DbHelper.table("dbtable.vmq4_moon_puzzle_roots").map { Vmq4MoonPuzzleRootsRow(it) } }

    public fun all(): List<Vmq4MoonPuzzleRootsRow> = cachedAll

    public fun getRow(row: Int): Vmq4MoonPuzzleRootsRow = Vmq4MoonPuzzleRootsRow(DbHelper.row(row))

    public fun getRow(column: String): Vmq4MoonPuzzleRootsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
