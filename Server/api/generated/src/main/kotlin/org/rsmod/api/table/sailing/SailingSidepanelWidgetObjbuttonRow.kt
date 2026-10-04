// AUTO-GENERATED for dbtable.sailing_sidepanel_widget_objbutton — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class SailingSidepanelWidgetObjbuttonRow(
  row: DbHelper,
) {
  public val defaultOptext: String =
      row.string("dbcol.sailing_sidepanel_widget_objbutton:default_optext")

  public val toggleEnabled: Boolean =
      row.boolean("dbcol.sailing_sidepanel_widget_objbutton:toggle_enabled")

  public val toggleOptext: List<String> =
      row.list("dbcol.sailing_sidepanel_widget_objbutton:toggle_optext", DbColumnCodec.StringCodec)

  public val objectID: ItemServerType = row.obj("dbcol.sailing_sidepanel_widget_objbutton:object")

  public val amount: Int = row.int("dbcol.sailing_sidepanel_widget_objbutton:amount")

  public val op2: List<Tuple2<Boolean, String>> =
      row.multiColumnMixed("dbcol.sailing_sidepanel_widget_objbutton:op2", DbColumnCodec.BooleanCodec, DbColumnCodec.StringCodec).toListOfTuple2()

  public val op3: List<Tuple2<Boolean, String>> =
      row.multiColumnMixed("dbcol.sailing_sidepanel_widget_objbutton:op3", DbColumnCodec.BooleanCodec, DbColumnCodec.StringCodec).toListOfTuple2()

  public val op4: List<Tuple2<Boolean, String>> =
      row.multiColumnMixed("dbcol.sailing_sidepanel_widget_objbutton:op4", DbColumnCodec.BooleanCodec, DbColumnCodec.StringCodec).toListOfTuple2()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingSidepanelWidgetObjbuttonRow> by
        lazy { DbHelper.table("dbtable.sailing_sidepanel_widget_objbutton").map { SailingSidepanelWidgetObjbuttonRow(it) } }

    public fun all(): List<SailingSidepanelWidgetObjbuttonRow> = cachedAll

    public fun getRow(row: Int): SailingSidepanelWidgetObjbuttonRow = SailingSidepanelWidgetObjbuttonRow(DbHelper.row(row))

    public fun getRow(column: String): SailingSidepanelWidgetObjbuttonRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
