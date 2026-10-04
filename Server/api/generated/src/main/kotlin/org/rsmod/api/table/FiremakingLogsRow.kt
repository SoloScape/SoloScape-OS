// AUTO-GENERATED for dbtable.firemaking_logs — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.SequenceServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class FiremakingLogsRow(
  row: DbHelper,
) {
  public val input: ItemServerType = row.obj("dbcol.firemaking_logs:input")

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.firemaking_logs:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.firemaking_logs:xp")

  public val output: ItemServerType? = row.objOptional("dbcol.firemaking_logs:output")

  public val category: String = row.string("dbcol.firemaking_logs:category")

  public val inputAmount: Int = row.int("dbcol.firemaking_logs:input_amount")

  public val outputAmount: Int? = row.intOptional("dbcol.firemaking_logs:output_amount")

  public val foresterInitialTicks: Int = row.int("dbcol.firemaking_logs:forester_initial_ticks")

  public val foresterLogTicks: Int = row.int("dbcol.firemaking_logs:forester_log_ticks")

  public val foresterAnimation: SequenceServerType? =
      row.columnOptional("dbcol.firemaking_logs:forester_animation", DbColumnCodec.SeqCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FiremakingLogsRow> by
        lazy { DbHelper.table("dbtable.firemaking_logs").map { FiremakingLogsRow(it) } }

    public fun all(): List<FiremakingLogsRow> = cachedAll

    public fun getRow(row: Int): FiremakingLogsRow = FiremakingLogsRow(DbHelper.row(row))

    public fun getRow(column: String): FiremakingLogsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
