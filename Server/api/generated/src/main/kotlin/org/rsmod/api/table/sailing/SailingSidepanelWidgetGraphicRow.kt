// AUTO-GENERATED for dbtable.sailing_sidepanel_widget_graphic — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.multiColumnMixed
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class SailingSidepanelWidgetGraphicRow(
  row: DbHelper,
) {
  public val graphic: List<Tuple2<Int, Int>> =
      row.multiColumnMixed("dbcol.sailing_sidepanel_widget_graphic:graphic", GraphicIdCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingSidepanelWidgetGraphicRow> by
        lazy { DbHelper.table("dbtable.sailing_sidepanel_widget_graphic").map { SailingSidepanelWidgetGraphicRow(it) } }

    public fun all(): List<SailingSidepanelWidgetGraphicRow> = cachedAll

    public fun getRow(row: Int): SailingSidepanelWidgetGraphicRow = SailingSidepanelWidgetGraphicRow(DbHelper.row(row))

    public fun getRow(column: String): SailingSidepanelWidgetGraphicRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
