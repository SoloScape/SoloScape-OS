// AUTO-GENERATED for dbtable.fsw_points_boss_info_table — do not edit.
package org.rsmod.api.table.fsw

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.multiColumnMixed
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.toListOfTuple3
import org.rsmod.api.table.toTuple3

public class FswPointsBossInfoTableRow(
  row: DbHelper,
) {
  public val info: List<Tuple3<Int, String, Int>> =
      row.multiColumnMixed("dbcol.fsw_points_boss_info_table:info", GraphicIdCodec, DbColumnCodec.StringCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FswPointsBossInfoTableRow> by
        lazy { DbHelper.table("dbtable.fsw_points_boss_info_table").map { FswPointsBossInfoTableRow(it) } }

    public fun all(): List<FswPointsBossInfoTableRow> = cachedAll

    public fun getRow(row: Int): FswPointsBossInfoTableRow = FswPointsBossInfoTableRow(DbHelper.row(row))

    public fun getRow(column: String): FswPointsBossInfoTableRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
