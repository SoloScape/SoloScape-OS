// AUTO-GENERATED for dbtable.fsw_points_info_table — do not edit.
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
import org.rsmod.api.table.Tuple7
import org.rsmod.api.table.toListOfTuple7
import org.rsmod.api.table.toTuple7

public class FswPointsInfoTableRow(
  row: DbHelper,
) {
  public val info: List<Tuple7<Int, Int, Int, Int, String, String, String>> =
      row.multiColumnMixed("dbcol.fsw_points_info_table:info", GraphicIdCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.StringCodec, DbColumnCodec.StringCodec, DbColumnCodec.StringCodec).toListOfTuple7()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FswPointsInfoTableRow> by
        lazy { DbHelper.table("dbtable.fsw_points_info_table").map { FswPointsInfoTableRow(it) } }

    public fun all(): List<FswPointsInfoTableRow> = cachedAll

    public fun getRow(row: Int): FswPointsInfoTableRow = FswPointsInfoTableRow(DbHelper.row(row))

    public fun getRow(column: String): FswPointsInfoTableRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
