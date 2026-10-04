// AUTO-GENERATED for dbtable.comborune_recipe — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class ComboruneRecipeRow(
  row: DbHelper,
) {
  public val input: ItemServerType? = row.objOptional("dbcol.comborune_recipe:input")

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixedOptional("dbcol.comborune_recipe:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int? = row.intOptional("dbcol.comborune_recipe:xp")

  public val output: ItemServerType? = row.objOptional("dbcol.comborune_recipe:output")

  public val category: String? = row.stringOptional("dbcol.comborune_recipe:category")

  public val inputAmount: Int? = row.intOptional("dbcol.comborune_recipe:input_amount")

  public val outputAmount: Int? = row.intOptional("dbcol.comborune_recipe:output_amount")

  public val talisman: ItemServerType? = row.objOptional("dbcol.comborune_recipe:talisman")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ComboruneRecipeRow> by
        lazy { DbHelper.table("dbtable.comborune_recipe").map { ComboruneRecipeRow(it) } }

    public fun all(): List<ComboruneRecipeRow> = cachedAll

    public fun getRow(row: Int): ComboruneRecipeRow = ComboruneRecipeRow(DbHelper.row(row))

    public fun getRow(column: String): ComboruneRecipeRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
