// AUTO-GENERATED for dbtable.cooking_ales — do not edit.
package org.rsmod.api.table.cooking

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

public class CookingAlesRow(
  row: DbHelper,
) {
  public val input: ItemServerType = row.obj("dbcol.cooking_ales:input")

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.cooking_ales:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.cooking_ales:xp")

  public val output: List<ItemServerType> =
      row.list("dbcol.cooking_ales:output", DbColumnCodec.ItemServerTypeCodec)

  public val category: String = row.string("dbcol.cooking_ales:category")

  public val inputAmount: Int = row.int("dbcol.cooking_ales:input_amount")

  public val outputAmount: List<Int> =
      row.list("dbcol.cooking_ales:output_amount", DbColumnCodec.IntCodec)

  public val vatOffset: Int = row.int("dbcol.cooking_ales:vat_offset")

  public val barrelOffset: Int = row.int("dbcol.cooking_ales:barrel_offset")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CookingAlesRow> by
        lazy { DbHelper.table("dbtable.cooking_ales").map { CookingAlesRow(it) } }

    public fun all(): List<CookingAlesRow> = cachedAll

    public fun getRow(row: Int): CookingAlesRow = CookingAlesRow(DbHelper.row(row))

    public fun getRow(column: String): CookingAlesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
