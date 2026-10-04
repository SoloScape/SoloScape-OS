// AUTO-GENERATED for dbtable.smithing_dragon_forge — do not edit.
package org.rsmod.api.table.smithing

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

public class SmithingDragonForgeRow(
  row: DbHelper,
) {
  public val input: List<ItemServerType> =
      row.list("dbcol.smithing_dragon_forge:input", DbColumnCodec.ItemServerTypeCodec)

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.smithing_dragon_forge:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.smithing_dragon_forge:xp")

  public val output: ItemServerType = row.obj("dbcol.smithing_dragon_forge:output")

  public val category: String = row.string("dbcol.smithing_dragon_forge:category")

  public val inputAmount: List<Int> =
      row.list("dbcol.smithing_dragon_forge:input_amount", DbColumnCodec.IntCodec)

  public val outputAmount: Int = row.int("dbcol.smithing_dragon_forge:output_amount")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SmithingDragonForgeRow> by
        lazy { DbHelper.table("dbtable.smithing_dragon_forge").map { SmithingDragonForgeRow(it) } }

    public fun all(): List<SmithingDragonForgeRow> = cachedAll

    public fun getRow(row: Int): SmithingDragonForgeRow = SmithingDragonForgeRow(DbHelper.row(row))

    public fun getRow(column: String): SmithingDragonForgeRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
