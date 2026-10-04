// AUTO-GENERATED for dbtable.sailing_sidepanel_widget_button_target_npc — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toTuple2

public class SailingSidepanelWidgetButtonTargetNpcRow(
  row: DbHelper,
) {
  public val defaultTargetVerb: String? =
      row.stringOptional("dbcol.sailing_sidepanel_widget_button_target_npc:default_target_verb")

  public val defaultGraphic: Tuple2<Int?, Int?>? =
      row.multiColumnMixedOptional("dbcol.sailing_sidepanel_widget_button_target_npc:default_graphic", GraphicIdCodec, DbColumnCodec.IntCodec).toTuple2()

  public val defaultButtonCaption: String? =
      row.stringOptional("dbcol.sailing_sidepanel_widget_button_target_npc:default_button_caption")

  public val longButton: Boolean? =
      row.booleanOptional("dbcol.sailing_sidepanel_widget_button_target_npc:long_button")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingSidepanelWidgetButtonTargetNpcRow> by
        lazy { DbHelper.table("dbtable.sailing_sidepanel_widget_button_target_npc").map { SailingSidepanelWidgetButtonTargetNpcRow(it) } }

    public fun all(): List<SailingSidepanelWidgetButtonTargetNpcRow> = cachedAll

    public fun getRow(row: Int): SailingSidepanelWidgetButtonTargetNpcRow = SailingSidepanelWidgetButtonTargetNpcRow(DbHelper.row(row))

    public fun getRow(column: String): SailingSidepanelWidgetButtonTargetNpcRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
