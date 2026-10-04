// AUTO-GENERATED for dbtable.runecrafting_tiara — do not edit.
package org.rsmod.api.table.runecrafting

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class RunecraftingTiaraRow(
  row: DbHelper,
) {
  public val item: ItemServerType = row.obj("dbcol.runecrafting_tiara:item")

  public val alter: ObjectServerType = row.loc("dbcol.runecrafting_tiara:alter")

  public val xp: Int = row.int("dbcol.runecrafting_tiara:xp")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<RunecraftingTiaraRow> by
        lazy { DbHelper.table("dbtable.runecrafting_tiara").map { RunecraftingTiaraRow(it) } }

    public fun all(): List<RunecraftingTiaraRow> = cachedAll

    public fun getRow(row: Int): RunecraftingTiaraRow = RunecraftingTiaraRow(DbHelper.row(row))

    public fun getRow(column: String): RunecraftingTiaraRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
