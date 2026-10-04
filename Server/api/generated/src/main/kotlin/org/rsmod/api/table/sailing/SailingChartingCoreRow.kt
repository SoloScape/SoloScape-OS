// AUTO-GENERATED for dbtable.sailing_charting_core — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.DbtableIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.sailing.SailingDockRow
import org.rsmod.api.table.sailing.SailingSeaHazardRow
import org.rsmod.api.table.sailing.SailingSeaRow

public class SailingChartingCoreRow(
  row: DbHelper,
) {
  public val uniqueId: Int = row.int("dbcol.sailing_charting_core:unique_id")

  public val hint: String = row.string("dbcol.sailing_charting_core:hint")

  public val sailingSea: SailingSeaRow by
      lazy { SailingSeaRow.getRow(row.dbRow("dbcol.sailing_charting_core:sailing_sea").id) }

  public val sailingSeaSecondary: SailingSeaRow? by
      lazy { row.columnOptional("dbcol.sailing_charting_core:sailing_sea_secondary", DbColumnCodec.DbRowTypeCodec)?.let { SailingSeaRow.getRow(it.id) } }

  public val giveRepeatXp: Boolean? =
      row.booleanOptional("dbcol.sailing_charting_core:give_repeat_xp")

  public val chartingType: Int =
      row.column("dbcol.sailing_charting_core:charting_type", DbtableIdCodec)

  public val hazard: SailingSeaHazardRow? by
      lazy { row.columnOptional("dbcol.sailing_charting_core:hazard", DbColumnCodec.DbRowTypeCodec)?.let { SailingSeaHazardRow.getRow(it.id) } }

  public val requiredDock: SailingDockRow? by
      lazy { row.columnOptional("dbcol.sailing_charting_core:required_dock", DbColumnCodec.DbRowTypeCodec)?.let { SailingDockRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingChartingCoreRow> by
        lazy { DbHelper.table("dbtable.sailing_charting_core").map { SailingChartingCoreRow(it) } }

    public fun all(): List<SailingChartingCoreRow> = cachedAll

    public fun getRow(row: Int): SailingChartingCoreRow = SailingChartingCoreRow(DbHelper.row(row))

    public fun getRow(column: String): SailingChartingCoreRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
