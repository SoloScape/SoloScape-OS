// AUTO-GENERATED for dbtable.ui_highlighting_style_border — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.UiHighlightingFxPulseRow

public class UiHighlightingStyleBorderRow(
  row: DbHelper,
) {
  public val width: Int = row.int("dbcol.ui_highlighting_style_border:width")

  public val colour: Int = row.int("dbcol.ui_highlighting_style_border:colour")

  public val padding: Int? = row.intOptional("dbcol.ui_highlighting_style_border:padding")

  public val fx: UiHighlightingFxPulseRow by
      lazy { UiHighlightingFxPulseRow.getRow(row.dbRow("dbcol.ui_highlighting_style_border:fx").id) }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<UiHighlightingStyleBorderRow> by
        lazy { DbHelper.table("dbtable.ui_highlighting_style_border").map { UiHighlightingStyleBorderRow(it) } }

    public fun all(): List<UiHighlightingStyleBorderRow> = cachedAll

    public fun getRow(row: Int): UiHighlightingStyleBorderRow = UiHighlightingStyleBorderRow(DbHelper.row(row))

    public fun getRow(column: String): UiHighlightingStyleBorderRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
