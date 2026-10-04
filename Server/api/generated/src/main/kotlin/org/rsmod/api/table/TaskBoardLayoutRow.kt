// AUTO-GENERATED for dbtable.task_board_layout — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumn
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class TaskBoardLayoutRow(
  row: DbHelper,
) {
  public val layoutId: Int = row.int("dbcol.task_board_layout:layout_id")

  public val styleTask: List<Int> =
      row.multiColumn("dbcol.task_board_layout:style_task", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val tasksOnFirstRow: Int = row.int("dbcol.task_board_layout:tasks_on_first_row")

  public val tasksOnSubsequentRows: Int =
      row.int("dbcol.task_board_layout:tasks_on_subsequent_rows")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<TaskBoardLayoutRow> by
        lazy { DbHelper.table("dbtable.task_board_layout").map { TaskBoardLayoutRow(it) } }

    public fun all(): List<TaskBoardLayoutRow> = cachedAll

    public fun getRow(row: Int): TaskBoardLayoutRow = TaskBoardLayoutRow(DbHelper.row(row))

    public fun getRow(column: String): TaskBoardLayoutRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
