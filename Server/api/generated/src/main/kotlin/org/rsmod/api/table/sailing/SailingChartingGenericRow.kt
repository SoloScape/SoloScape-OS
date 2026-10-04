// AUTO-GENERATED for dbtable.sailing_charting_generic — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.dbRow
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.sailing.SailingChartingCoreRow

public class SailingChartingGenericRow(
  row: DbHelper,
) {
  public val sailingChartingCore: SailingChartingCoreRow by
      lazy { SailingChartingCoreRow.getRow(row.dbRow("dbcol.sailing_charting_generic:sailing_charting_core").id) }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingChartingGenericRow> by
        lazy { DbHelper.table("dbtable.sailing_charting_generic").map { SailingChartingGenericRow(it) } }

    public fun all(): List<SailingChartingGenericRow> = cachedAll

    public fun getRow(row: Int): SailingChartingGenericRow = SailingChartingGenericRow(DbHelper.row(row))

    public fun getRow(column: String): SailingChartingGenericRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
