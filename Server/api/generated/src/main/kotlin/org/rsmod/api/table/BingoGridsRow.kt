// AUTO-GENERATED for dbtable.bingo_grids — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.DBRowType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.multiColumnMixed
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.RewardSelectionRow
import org.rsmod.api.table.Tuple4
import org.rsmod.api.table.toListOfTuple4
import org.rsmod.api.table.toTuple4

public class BingoGridsRow(
  row: DbHelper,
) {
  public val gridLayout: Int = row.int("dbcol.bingo_grids:grid_layout")

  public val bingoPointsToProgress: Int? =
      row.intOptional("dbcol.bingo_grids:bingo_points_to_progress")

  public val challenge: List<Tuple4<DBRowType, Int, Int, Int>> =
      row.multiColumnMixed("dbcol.bingo_grids:challenge", DbColumnCodec.DbRowTypeCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple4()

  public val rewardSelection: List<RewardSelectionRow> by
      lazy { row.list("dbcol.bingo_grids:reward_selection", DbColumnCodec.DbRowTypeCodec).map { RewardSelectionRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<BingoGridsRow> by
        lazy { DbHelper.table("dbtable.bingo_grids").map { BingoGridsRow(it) } }

    public fun all(): List<BingoGridsRow> = cachedAll

    public fun getRow(row: Int): BingoGridsRow = BingoGridsRow(DbHelper.row(row))

    public fun getRow(column: String): BingoGridsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
