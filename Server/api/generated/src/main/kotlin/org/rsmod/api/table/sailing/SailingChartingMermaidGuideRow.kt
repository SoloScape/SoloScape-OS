// AUTO-GENERATED for dbtable.sailing_charting_mermaid_guide — do not edit.
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

public class SailingChartingMermaidGuideRow(
  row: DbHelper,
) {
  public val sailingChartingCore: SailingChartingCoreRow by
      lazy { SailingChartingCoreRow.getRow(row.dbRow("dbcol.sailing_charting_mermaid_guide:sailing_charting_core").id) }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingChartingMermaidGuideRow> by
        lazy { DbHelper.table("dbtable.sailing_charting_mermaid_guide").map { SailingChartingMermaidGuideRow(it) } }

    public fun all(): List<SailingChartingMermaidGuideRow> = cachedAll

    public fun getRow(row: Int): SailingChartingMermaidGuideRow = SailingChartingMermaidGuideRow(DbHelper.row(row))

    public fun getRow(column: String): SailingChartingMermaidGuideRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
