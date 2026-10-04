// AUTO-GENERATED for dbtable.herblore_finished — do not edit.
package org.rsmod.api.table.herblore

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class HerbloreFinishedRow(
  row: DbHelper,
) {
  public val input: List<ItemServerType> =
      row.list("dbcol.herblore_finished:input", DbColumnCodec.ItemServerTypeCodec)

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.herblore_finished:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.herblore_finished:xp")

  public val output: ItemServerType = row.obj("dbcol.herblore_finished:output")

  public val category: String = row.string("dbcol.herblore_finished:category")

  public val inputAmount: List<Int> =
      row.list("dbcol.herblore_finished:input_amount", DbColumnCodec.IntCodec)

  public val outputAmount: Int = row.int("dbcol.herblore_finished:output_amount")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<HerbloreFinishedRow> by
        lazy { DbHelper.table("dbtable.herblore_finished").map { HerbloreFinishedRow(it) } }

    public fun all(): List<HerbloreFinishedRow> = cachedAll

    public fun getRow(row: Int): HerbloreFinishedRow = HerbloreFinishedRow(DbHelper.row(row))

    public fun getRow(column: String): HerbloreFinishedRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
