// AUTO-GENERATED for dbtable.sailing_sidepanel_widget_text — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.list
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingSidepanelWidgetTextRow(
  row: DbHelper,
) {
  public val text: List<String> =
      row.list("dbcol.sailing_sidepanel_widget_text:text", DbColumnCodec.StringCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingSidepanelWidgetTextRow> by
        lazy { DbHelper.table("dbtable.sailing_sidepanel_widget_text").map { SailingSidepanelWidgetTextRow(it) } }

    public fun all(): List<SailingSidepanelWidgetTextRow> = cachedAll

    public fun getRow(row: Int): SailingSidepanelWidgetTextRow = SailingSidepanelWidgetTextRow(DbHelper.row(row))

    public fun getRow(column: String): SailingSidepanelWidgetTextRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
