// AUTO-GENERATED for dbtable.farming_crop — do not edit.
package org.rsmod.api.table.farming

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.farming.FarmingCropRow
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class FarmingCropRow(
  row: DbHelper,
) {
  public val input: ItemServerType = row.obj("dbcol.farming_crop:input")

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.farming_crop:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.farming_crop:xp")

  public val output: ItemServerType = row.obj("dbcol.farming_crop:output")

  public val category: String = row.string("dbcol.farming_crop:category")

  public val inputAmount: Int = row.int("dbcol.farming_crop:input_amount")

  public val outputAmount: Int = row.int("dbcol.farming_crop:output_amount")

  public val name: String = row.string("dbcol.farming_crop:name")

  public val plantXp: Int = row.int("dbcol.farming_crop:plant_xp")

  public val growBase: Int = row.int("dbcol.farming_crop:grow_base")

  public val stages: Int = row.int("dbcol.farming_crop:stages")

  public val stageMinutes: Int = row.int("dbcol.farming_crop:stage_minutes")

  public val diseasedBase: Int = row.int("dbcol.farming_crop:diseased_base")

  public val protection: FarmingCropRow? by
      lazy { row.columnOptional("dbcol.farming_crop:protection", DbColumnCodec.DbRowTypeCodec)?.let { FarmingCropRow.getRow(it.id) } }

  public val transmit: List<Int> =
      row.slotsOptional("dbcol.farming_crop:transmit", DbColumnCodec.IntCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FarmingCropRow> by
        lazy { DbHelper.table("dbtable.farming_crop").map { FarmingCropRow(it) } }

    public fun all(): List<FarmingCropRow> = cachedAll

    public fun getRow(row: Int): FarmingCropRow = FarmingCropRow(DbHelper.row(row))

    public fun getRow(column: String): FarmingCropRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
