// AUTO-GENERATED for dbtable.toggle_list_interface — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class ToggleListInterfaceRow(
  row: DbHelper,
) {
  public val title: String = row.string("dbcol.toggle_list_interface:title")

  public val info: List<Tuple2<String, ItemServerType>> =
      row.multiColumnMixed("dbcol.toggle_list_interface:info", DbColumnCodec.StringCodec, DbColumnCodec.ItemServerTypeCodec).toListOfTuple2()

  public val disableOnLeagues: Boolean =
      row.boolean("dbcol.toggle_list_interface:disable_on_leagues")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ToggleListInterfaceRow> by
        lazy { DbHelper.table("dbtable.toggle_list_interface").map { ToggleListInterfaceRow(it) } }

    public fun all(): List<ToggleListInterfaceRow> = cachedAll

    public fun getRow(row: Int): ToggleListInterfaceRow = ToggleListInterfaceRow(DbHelper.row(row))

    public fun getRow(column: String): ToggleListInterfaceRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
