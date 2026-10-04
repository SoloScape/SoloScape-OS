// AUTO-GENERATED for dbtable.slayer_task_sublist — do not edit.
package org.rsmod.api.table.slayer

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.slayer.SlayerTaskRow

public class SlayerTaskSublistRow(
  row: DbHelper,
) {
  public val subtableId: Int = row.int("dbcol.slayer_task_sublist:subtable_id")

  public val taskSubtableId: Int = row.int("dbcol.slayer_task_sublist:task_subtable_id")

  public val task: SlayerTaskRow by
      lazy { SlayerTaskRow.getRow(row.dbRow("dbcol.slayer_task_sublist:task").id) }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SlayerTaskSublistRow> by
        lazy { DbHelper.table("dbtable.slayer_task_sublist").map { SlayerTaskSublistRow(it) } }

    public fun all(): List<SlayerTaskSublistRow> = cachedAll

    public fun getRow(row: Int): SlayerTaskSublistRow = SlayerTaskSublistRow(DbHelper.row(row))

    public fun getRow(column: String): SlayerTaskSublistRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
