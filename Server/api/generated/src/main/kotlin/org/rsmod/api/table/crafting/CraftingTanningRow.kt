// AUTO-GENERATED for dbtable.crafting_tanning — do not edit.
package org.rsmod.api.table.crafting

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class CraftingTanningRow(
  row: DbHelper,
) {
  public val input: ItemServerType = row.obj("dbcol.crafting_tanning:input")

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.crafting_tanning:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.crafting_tanning:xp")

  public val output: ItemServerType = row.obj("dbcol.crafting_tanning:output")

  public val category: String? = row.stringOptional("dbcol.crafting_tanning:category")

  public val inputAmount: Int = row.int("dbcol.crafting_tanning:input_amount")

  public val outputAmount: Int = row.int("dbcol.crafting_tanning:output_amount")

  public val cost: Int = row.int("dbcol.crafting_tanning:cost")

  public val slotLetter: String? = row.stringOptional("dbcol.crafting_tanning:slot_letter")

  public val slotLabel: String? = row.stringOptional("dbcol.crafting_tanning:slot_label")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CraftingTanningRow> by
        lazy { DbHelper.table("dbtable.crafting_tanning").map { CraftingTanningRow(it) } }

    public fun all(): List<CraftingTanningRow> = cachedAll

    public fun getRow(row: Int): CraftingTanningRow = CraftingTanningRow(DbHelper.row(row))

    public fun getRow(column: String): CraftingTanningRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
