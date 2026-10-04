// AUTO-GENERATED for dbtable.dt2_scar_maze — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Dt2ScarMazeRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Dt2ScarMazeRow> by
        lazy { DbHelper.table("dbtable.dt2_scar_maze").map { Dt2ScarMazeRow(it) } }

    public fun all(): List<Dt2ScarMazeRow> = cachedAll

    public fun getRow(row: Int): Dt2ScarMazeRow = Dt2ScarMazeRow(DbHelper.row(row))

    public fun getRow(column: String): Dt2ScarMazeRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
