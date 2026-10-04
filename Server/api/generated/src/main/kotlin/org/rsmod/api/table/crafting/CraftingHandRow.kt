// AUTO-GENERATED for dbtable.crafting_hand — do not edit.
package org.rsmod.api.table.crafting

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toListOfTuple3
import org.rsmod.api.table.toTuple2
import org.rsmod.api.table.toTuple3

public class CraftingHandRow(
  row: DbHelper,
) {
  public val input: List<ItemServerType> =
      row.list("dbcol.crafting_hand:input", DbColumnCodec.ItemServerTypeCodec)

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.crafting_hand:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.crafting_hand:xp")

  public val output: List<ItemServerType> =
      row.list("dbcol.crafting_hand:output", DbColumnCodec.ItemServerTypeCodec)

  public val category: String? = row.stringOptional("dbcol.crafting_hand:category")

  public val inputAmount: List<Int> =
      row.list("dbcol.crafting_hand:input_amount", DbColumnCodec.IntCodec)

  public val outputAmount: List<Int> =
      row.list("dbcol.crafting_hand:output_amount", DbColumnCodec.IntCodec)

  public val section: String = row.string("dbcol.crafting_hand:section")

  public val successLow: Int? = row.intOptional("dbcol.crafting_hand:success_low")

  public val successHigh: Int? = row.intOptional("dbcol.crafting_hand:success_high")

  public val ticks: Int? = row.intOptional("dbcol.crafting_hand:ticks")

  public val failXp: Int? = row.intOptional("dbcol.crafting_hand:fail_xp")

  public val failItem: ItemServerType? = row.objOptional("dbcol.crafting_hand:fail_item")

  public val anim: List<String> =
      row.slotsOptional("dbcol.crafting_hand:anim", DbColumnCodec.StringCodec)

  public val spotanim: List<String> =
      row.slotsOptional("dbcol.crafting_hand:spotanim", DbColumnCodec.StringCodec)

  public val triggers: List<ItemServerType> =
      row.slotsOptional("dbcol.crafting_hand:triggers", DbColumnCodec.ItemServerTypeCodec)

  public val xpExtra: List<Tuple2<StatType, Int>> =
      row.multiColumnMixedOptional("dbcol.crafting_hand:xp_extra", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val tool: ItemServerType? = row.objOptional("dbcol.crafting_hand:tool")

  public val sound: String? = row.stringOptional("dbcol.crafting_hand:sound")

  public val message: String? = row.stringOptional("dbcol.crafting_hand:message")

  public val actionName: String? = row.stringOptional("dbcol.crafting_hand:action_name")

  public val confirmTitle: List<String> =
      row.slotsOptional("dbcol.crafting_hand:confirm_title", DbColumnCodec.StringCodec)

  public val confirmWarning: String? = row.stringOptional("dbcol.crafting_hand:confirm_warning")

  public val resultDialogue: String? = row.stringOptional("dbcol.crafting_hand:result_dialogue")

  public val questReq: List<Tuple2<String, Int>> =
      row.multiColumnMixedOptional("dbcol.crafting_hand:quest_req", DbColumnCodec.StringCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val unlockVarbit: List<Tuple3<String, Int, Int>> =
      row.multiColumnMixedOptional("dbcol.crafting_hand:unlock_varbit", DbColumnCodec.StringCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val lockedMessage: String? = row.stringOptional("dbcol.crafting_hand:locked_message")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CraftingHandRow> by
        lazy { DbHelper.table("dbtable.crafting_hand").map { CraftingHandRow(it) } }

    public fun all(): List<CraftingHandRow> = cachedAll

    public fun getRow(row: Int): CraftingHandRow = CraftingHandRow(DbHelper.row(row))

    public fun getRow(column: String): CraftingHandRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
