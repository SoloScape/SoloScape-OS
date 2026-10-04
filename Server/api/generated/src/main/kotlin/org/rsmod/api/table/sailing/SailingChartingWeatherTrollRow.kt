// AUTO-GENERATED for dbtable.sailing_charting_weather_troll — do not edit.
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

public class SailingChartingWeatherTrollRow(
  row: DbHelper,
) {
  public val sailingChartingCore: SailingChartingCoreRow by
      lazy { SailingChartingCoreRow.getRow(row.dbRow("dbcol.sailing_charting_weather_troll:sailing_charting_core").id) }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingChartingWeatherTrollRow> by
        lazy { DbHelper.table("dbtable.sailing_charting_weather_troll").map { SailingChartingWeatherTrollRow(it) } }

    public fun all(): List<SailingChartingWeatherTrollRow> = cachedAll

    public fun getRow(row: Int): SailingChartingWeatherTrollRow = SailingChartingWeatherTrollRow(DbHelper.row(row))

    public fun getRow(column: String): SailingChartingWeatherTrollRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
