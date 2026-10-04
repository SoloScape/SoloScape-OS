// AUTO-GENERATED for dbtable.item_transmog — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class ItemTransmogRow(
  row: DbHelper,
) {
  public val group: Int = row.int("dbcol.item_transmog:group")

  public val groupId: Int = row.int("dbcol.item_transmog:group_id")

  public val namedobj: ItemServerType = row.obj("dbcol.item_transmog:namedobj")

  public val uiName: String? = row.stringOptional("dbcol.item_transmog:ui_name")

  public val uiExamine: String? = row.stringOptional("dbcol.item_transmog:ui_examine")

  public val uiOpName: String? = row.stringOptional("dbcol.item_transmog:ui_op_name")

  public val showWhenUnavailable: Boolean? =
      row.booleanOptional("dbcol.item_transmog:show_when_unavailable")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ItemTransmogRow> by
        lazy { DbHelper.table("dbtable.item_transmog").map { ItemTransmogRow(it) } }

    public fun all(): List<ItemTransmogRow> = cachedAll

    public fun getRow(row: Int): ItemTransmogRow = ItemTransmogRow(DbHelper.row(row))

    public fun getRow(column: String): ItemTransmogRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
