// AUTO-GENERATED for dbtable.sailing_charting_tool_recovery — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingChartingToolRecoveryRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.sailing_charting_tool_recovery:name")

  public val tool: List<ItemServerType> =
      row.list("dbcol.sailing_charting_tool_recovery:tool", DbColumnCodec.ItemServerTypeCodec)

  public val uniqueId: Int = row.int("dbcol.sailing_charting_tool_recovery:unique_id")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingChartingToolRecoveryRow> by
        lazy { DbHelper.table("dbtable.sailing_charting_tool_recovery").map { SailingChartingToolRecoveryRow(it) } }

    public fun all(): List<SailingChartingToolRecoveryRow> = cachedAll

    public fun getRow(row: Int): SailingChartingToolRecoveryRow = SailingChartingToolRecoveryRow(DbHelper.row(row))

    public fun getRow(column: String): SailingChartingToolRecoveryRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
