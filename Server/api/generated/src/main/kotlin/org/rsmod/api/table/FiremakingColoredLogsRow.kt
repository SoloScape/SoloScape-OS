// AUTO-GENERATED for dbtable.firemaking_colored_logs — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class FiremakingColoredLogsRow(
  row: DbHelper,
) {
  public val logItem: ItemServerType = row.obj("dbcol.firemaking_colored_logs:log_item")

  public val firelighter: ItemServerType = row.obj("dbcol.firemaking_colored_logs:firelighter")

  public val fireObject: ObjectServerType = row.loc("dbcol.firemaking_colored_logs:fire_object")

  public val campfireObject: ObjectServerType =
      row.loc("dbcol.firemaking_colored_logs:campfire_object")

  public val index: Int = row.int("dbcol.firemaking_colored_logs:index")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FiremakingColoredLogsRow> by
        lazy { DbHelper.table("dbtable.firemaking_colored_logs").map { FiremakingColoredLogsRow(it) } }

    public fun all(): List<FiremakingColoredLogsRow> = cachedAll

    public fun getRow(row: Int): FiremakingColoredLogsRow = FiremakingColoredLogsRow(DbHelper.row(row))

    public fun getRow(column: String): FiremakingColoredLogsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
