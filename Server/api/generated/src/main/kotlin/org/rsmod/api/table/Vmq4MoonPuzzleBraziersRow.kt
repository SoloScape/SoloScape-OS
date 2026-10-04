// AUTO-GENERATED for dbtable.vmq4_moon_puzzle_braziers — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Vmq4MoonPuzzleBraziersRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Vmq4MoonPuzzleBraziersRow> by
        lazy { DbHelper.table("dbtable.vmq4_moon_puzzle_braziers").map { Vmq4MoonPuzzleBraziersRow(it) } }

    public fun all(): List<Vmq4MoonPuzzleBraziersRow> = cachedAll

    public fun getRow(row: Int): Vmq4MoonPuzzleBraziersRow = Vmq4MoonPuzzleBraziersRow(DbHelper.row(row))

    public fun getRow(column: String): Vmq4MoonPuzzleBraziersRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
