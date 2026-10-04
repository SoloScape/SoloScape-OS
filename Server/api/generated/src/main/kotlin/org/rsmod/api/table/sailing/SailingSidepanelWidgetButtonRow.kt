// AUTO-GENERATED for dbtable.sailing_sidepanel_widget_button — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class SailingSidepanelWidgetButtonRow(
  row: DbHelper,
) {
  public val defaultOptext: String =
      row.string("dbcol.sailing_sidepanel_widget_button:default_optext")

  public val defaultGraphic: List<Tuple2<Int, Int>> =
      row.multiColumnMixed("dbcol.sailing_sidepanel_widget_button:default_graphic", GraphicIdCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val defaultButtonCaption: String? =
      row.stringOptional("dbcol.sailing_sidepanel_widget_button:default_button_caption")

  public val toggleEnabled: Boolean? =
      row.booleanOptional("dbcol.sailing_sidepanel_widget_button:toggle_enabled")

  public val toggleOptext: List<String> =
      row.slotsOptional("dbcol.sailing_sidepanel_widget_button:toggle_optext", DbColumnCodec.StringCodec)

  public val toggleGraphic: List<Tuple2<Int, Int>> =
      row.multiColumnMixed("dbcol.sailing_sidepanel_widget_button:toggle_graphic", GraphicIdCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val toggleButtonCaption: String? =
      row.stringOptional("dbcol.sailing_sidepanel_widget_button:toggle_button_caption")

  public val longButton: Boolean? =
      row.booleanOptional("dbcol.sailing_sidepanel_widget_button:long_button")

  public val op2: List<Tuple2<Boolean, String>> =
      row.multiColumnMixedOptional("dbcol.sailing_sidepanel_widget_button:op2", DbColumnCodec.BooleanCodec, DbColumnCodec.StringCodec).toListOfTuple2()

  public val op3: List<Tuple2<Boolean, String>> =
      row.multiColumnMixedOptional("dbcol.sailing_sidepanel_widget_button:op3", DbColumnCodec.BooleanCodec, DbColumnCodec.StringCodec).toListOfTuple2()

  public val op4: List<Tuple2<Boolean, String>> =
      row.multiColumnMixedOptional("dbcol.sailing_sidepanel_widget_button:op4", DbColumnCodec.BooleanCodec, DbColumnCodec.StringCodec).toListOfTuple2()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingSidepanelWidgetButtonRow> by
        lazy { DbHelper.table("dbtable.sailing_sidepanel_widget_button").map { SailingSidepanelWidgetButtonRow(it) } }

    public fun all(): List<SailingSidepanelWidgetButtonRow> = cachedAll

    public fun getRow(row: Int): SailingSidepanelWidgetButtonRow = SailingSidepanelWidgetButtonRow(DbHelper.row(row))

    public fun getRow(column: String): SailingSidepanelWidgetButtonRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
