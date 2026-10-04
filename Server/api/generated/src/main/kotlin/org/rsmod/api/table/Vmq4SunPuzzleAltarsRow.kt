// AUTO-GENERATED for dbtable.vmq4_sun_puzzle_altars — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Vmq4SunPuzzleAltarsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Vmq4SunPuzzleAltarsRow> by
        lazy { DbHelper.table("dbtable.vmq4_sun_puzzle_altars").map { Vmq4SunPuzzleAltarsRow(it) } }

    public fun all(): List<Vmq4SunPuzzleAltarsRow> = cachedAll

    public fun getRow(row: Int): Vmq4SunPuzzleAltarsRow = Vmq4SunPuzzleAltarsRow(DbHelper.row(row))

    public fun getRow(column: String): Vmq4SunPuzzleAltarsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
