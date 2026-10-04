// AUTO-GENERATED for dbtable.sailing_sidepanel_widget_object — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingSidepanelWidgetObjectRow(
  row: DbHelper,
) {
  public val objectID: ItemServerType = row.obj("dbcol.sailing_sidepanel_widget_object:object")

  public val amount: Int = row.int("dbcol.sailing_sidepanel_widget_object:amount")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingSidepanelWidgetObjectRow> by
        lazy { DbHelper.table("dbtable.sailing_sidepanel_widget_object").map { SailingSidepanelWidgetObjectRow(it) } }

    public fun all(): List<SailingSidepanelWidgetObjectRow> = cachedAll

    public fun getRow(row: Int): SailingSidepanelWidgetObjectRow = SailingSidepanelWidgetObjectRow(DbHelper.row(row))

    public fun getRow(column: String): SailingSidepanelWidgetObjectRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
