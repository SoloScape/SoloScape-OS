// AUTO-GENERATED for dbtable.slayer_unlock — do not edit.
package org.rsmod.api.table.slayer

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.slayer.SlayerTaskRow

public class SlayerUnlockRow(
  row: DbHelper,
) {
  public val bit: Int = row.int("dbcol.slayer_unlock:bit")

  public val cost: Int = row.int("dbcol.slayer_unlock:cost")

  public val icon: ItemServerType = row.obj("dbcol.slayer_unlock:icon")

  public val name: String = row.string("dbcol.slayer_unlock:name")

  public val description: String = row.string("dbcol.slayer_unlock:description")

  public val refundable: Boolean? = row.booleanOptional("dbcol.slayer_unlock:refundable")

  public val listPosition: List<Int> =
      row.multiColumn("dbcol.slayer_unlock:list_position", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val relatedTask: List<SlayerTaskRow> by
      lazy { row.slotsOptional("dbcol.slayer_unlock:related_task", DbColumnCodec.DbRowTypeCodec).map { SlayerTaskRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SlayerUnlockRow> by
        lazy { DbHelper.table("dbtable.slayer_unlock").map { SlayerUnlockRow(it) } }

    public fun all(): List<SlayerUnlockRow> = cachedAll

    public fun getRow(row: Int): SlayerUnlockRow = SlayerUnlockRow(DbHelper.row(row))

    public fun getRow(column: String): SlayerUnlockRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
