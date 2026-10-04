// AUTO-GENERATED for dbtable.smithing_cannon_balls — do not edit.
package org.rsmod.api.table.smithing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class SmithingCannonBallsRow(
  row: DbHelper,
) {
  public val input: ItemServerType = row.obj("dbcol.smithing_cannon_balls:input")

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.smithing_cannon_balls:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.smithing_cannon_balls:xp")

  public val output: ItemServerType = row.obj("dbcol.smithing_cannon_balls:output")

  public val category: String = row.string("dbcol.smithing_cannon_balls:category")

  public val inputAmount: Int = row.int("dbcol.smithing_cannon_balls:input_amount")

  public val outputAmount: Int = row.int("dbcol.smithing_cannon_balls:output_amount")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SmithingCannonBallsRow> by
        lazy { DbHelper.table("dbtable.smithing_cannon_balls").map { SmithingCannonBallsRow(it) } }

    public fun all(): List<SmithingCannonBallsRow> = cachedAll

    public fun getRow(row: Int): SmithingCannonBallsRow = SmithingCannonBallsRow(DbHelper.row(row))

    public fun getRow(column: String): SmithingCannonBallsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
