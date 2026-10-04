// AUTO-GENERATED for dbtable.herblore_swamp_tar — do not edit.
package org.rsmod.api.table.herblore

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

public class HerbloreSwampTarRow(
  row: DbHelper,
) {
  public val input: ItemServerType = row.obj("dbcol.herblore_swamp_tar:input")

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.herblore_swamp_tar:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.herblore_swamp_tar:xp")

  public val output: ItemServerType = row.obj("dbcol.herblore_swamp_tar:output")

  public val category: String = row.string("dbcol.herblore_swamp_tar:category")

  public val inputAmount: Int = row.int("dbcol.herblore_swamp_tar:input_amount")

  public val outputAmount: Int = row.int("dbcol.herblore_swamp_tar:output_amount")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<HerbloreSwampTarRow> by
        lazy { DbHelper.table("dbtable.herblore_swamp_tar").map { HerbloreSwampTarRow(it) } }

    public fun all(): List<HerbloreSwampTarRow> = cachedAll

    public fun getRow(row: Int): HerbloreSwampTarRow = HerbloreSwampTarRow(DbHelper.row(row))

    public fun getRow(column: String): HerbloreSwampTarRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
