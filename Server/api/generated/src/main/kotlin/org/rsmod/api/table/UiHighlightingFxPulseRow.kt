// AUTO-GENERATED for dbtable.ui_highlighting_fx_pulse — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumn
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class UiHighlightingFxPulseRow(
  row: DbHelper,
) {
  public val transparencyRange: List<Int> =
      row.multiColumn("dbcol.ui_highlighting_fx_pulse:transparency_range", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val stepDuration: Int = row.int("dbcol.ui_highlighting_fx_pulse:step_duration")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<UiHighlightingFxPulseRow> by
        lazy { DbHelper.table("dbtable.ui_highlighting_fx_pulse").map { UiHighlightingFxPulseRow(it) } }

    public fun all(): List<UiHighlightingFxPulseRow> = cachedAll

    public fun getRow(row: Int): UiHighlightingFxPulseRow = UiHighlightingFxPulseRow(DbHelper.row(row))

    public fun getRow(column: String): UiHighlightingFxPulseRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
