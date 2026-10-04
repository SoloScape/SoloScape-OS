// AUTO-GENERATED for dbtable.fletching_blowpipe_crafting — do not edit.
package org.rsmod.api.table.fletching

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.objOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class FletchingBlowpipeCraftingRow(
  row: DbHelper,
) {
  public val levelRequired: Int = row.int("dbcol.fletching_blowpipe_crafting:level_required")

  public val xpGiven: Int = row.int("dbcol.fletching_blowpipe_crafting:xp_given")

  public val logResource: ItemServerType = row.obj("dbcol.fletching_blowpipe_crafting:log_resource")

  public val logQuantity: Int? = row.intOptional("dbcol.fletching_blowpipe_crafting:log_quantity")

  public val secondaryResource: ItemServerType? =
      row.objOptional("dbcol.fletching_blowpipe_crafting:secondary_resource")

  public val secondaryQuantity: Int? =
      row.intOptional("dbcol.fletching_blowpipe_crafting:secondary_quantity")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FletchingBlowpipeCraftingRow> by
        lazy { DbHelper.table("dbtable.fletching_blowpipe_crafting").map { FletchingBlowpipeCraftingRow(it) } }

    public fun all(): List<FletchingBlowpipeCraftingRow> = cachedAll

    public fun getRow(row: Int): FletchingBlowpipeCraftingRow = FletchingBlowpipeCraftingRow(DbHelper.row(row))

    public fun getRow(column: String): FletchingBlowpipeCraftingRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
