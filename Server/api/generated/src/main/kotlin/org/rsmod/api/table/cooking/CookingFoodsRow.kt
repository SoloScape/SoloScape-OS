// AUTO-GENERATED for dbtable.cooking_foods — do not edit.
package org.rsmod.api.table.cooking

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class CookingFoodsRow(
  row: DbHelper,
) {
  public val input: ItemServerType = row.obj("dbcol.cooking_foods:input")

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.cooking_foods:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.cooking_foods:xp")

  public val output: ItemServerType = row.obj("dbcol.cooking_foods:output")

  public val category: String = row.string("dbcol.cooking_foods:category")

  public val inputAmount: Int = row.int("dbcol.cooking_foods:input_amount")

  public val outputAmount: Int = row.int("dbcol.cooking_foods:output_amount")

  public val burnt: ItemServerType = row.obj("dbcol.cooking_foods:burnt")

  public val stopBurnFire: Int = row.int("dbcol.cooking_foods:stop_burn_fire")

  public val stopBurnRange: Int = row.int("dbcol.cooking_foods:stop_burn_range")

  public val low: Int = row.int("dbcol.cooking_foods:low")

  public val high: Int = row.int("dbcol.cooking_foods:high")

  public val supportsGauntlet: Boolean? =
      row.booleanOptional("dbcol.cooking_foods:supports_gauntlet")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CookingFoodsRow> by
        lazy { DbHelper.table("dbtable.cooking_foods").map { CookingFoodsRow(it) } }

    public fun all(): List<CookingFoodsRow> = cachedAll

    public fun getRow(row: Int): CookingFoodsRow = CookingFoodsRow(DbHelper.row(row))

    public fun getRow(column: String): CookingFoodsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
