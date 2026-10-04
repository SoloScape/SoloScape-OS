// AUTO-GENERATED for dbtable.runecrafting_runes — do not edit.
package org.rsmod.api.table.runecrafting

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

public class RunecraftingRunesRow(
  row: DbHelper,
) {
  public val input: List<ItemServerType> =
      row.list("dbcol.runecrafting_runes:input", DbColumnCodec.ItemServerTypeCodec)

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.runecrafting_runes:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.runecrafting_runes:xp")

  public val output: ItemServerType = row.obj("dbcol.runecrafting_runes:output")

  public val category: String = row.string("dbcol.runecrafting_runes:category")

  public val inputAmount: List<Int> =
      row.list("dbcol.runecrafting_runes:input_amount", DbColumnCodec.IntCodec)

  public val outputAmount: Int = row.int("dbcol.runecrafting_runes:output_amount")

  public val extract: ItemServerType = row.obj("dbcol.runecrafting_runes:extract")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<RunecraftingRunesRow> by
        lazy { DbHelper.table("dbtable.runecrafting_runes").map { RunecraftingRunesRow(it) } }

    public fun all(): List<RunecraftingRunesRow> = cachedAll

    public fun getRow(row: Int): RunecraftingRunesRow = RunecraftingRunesRow(DbHelper.row(row))

    public fun getRow(column: String): RunecraftingRunesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
