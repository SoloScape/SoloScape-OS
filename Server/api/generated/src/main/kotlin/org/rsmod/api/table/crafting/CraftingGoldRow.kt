// AUTO-GENERATED for dbtable.crafting_gold — do not edit.
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
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.objOptional
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

public class CraftingGoldRow(
  row: DbHelper,
) {
  public val input: List<ItemServerType> =
      row.list("dbcol.crafting_gold:input", DbColumnCodec.ItemServerTypeCodec)

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.crafting_gold:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.crafting_gold:xp")

  public val output: ItemServerType = row.obj("dbcol.crafting_gold:output")

  public val category: String = row.string("dbcol.crafting_gold:category")

  public val inputAmount: List<Int> =
      row.list("dbcol.crafting_gold:input_amount", DbColumnCodec.IntCodec)

  public val outputAmount: Int = row.int("dbcol.crafting_gold:output_amount")

  public val section: String = row.string("dbcol.crafting_gold:section")

  public val successLow: Int? = row.intOptional("dbcol.crafting_gold:success_low")

  public val successHigh: Int? = row.intOptional("dbcol.crafting_gold:success_high")

  public val ticks: Int? = row.intOptional("dbcol.crafting_gold:ticks")

  public val failXp: Int? = row.intOptional("dbcol.crafting_gold:fail_xp")

  public val failItem: ItemServerType? = row.objOptional("dbcol.crafting_gold:fail_item")

  public val anim: String? = row.stringOptional("dbcol.crafting_gold:anim")

  public val spotanim: String? = row.stringOptional("dbcol.crafting_gold:spotanim")

  public val triggers: ItemServerType? = row.objOptional("dbcol.crafting_gold:triggers")

  public val xpExtra: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.crafting_gold:xp_extra", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val tool: ItemServerType = row.obj("dbcol.crafting_gold:tool")

  public val sound: String? = row.stringOptional("dbcol.crafting_gold:sound")

  public val message: String? = row.stringOptional("dbcol.crafting_gold:message")

  public val actionName: String? = row.stringOptional("dbcol.crafting_gold:action_name")

  public val confirmTitle: String? = row.stringOptional("dbcol.crafting_gold:confirm_title")

  public val confirmWarning: String? = row.stringOptional("dbcol.crafting_gold:confirm_warning")

  public val resultDialogue: String? = row.stringOptional("dbcol.crafting_gold:result_dialogue")

  public val questReq: Tuple2<String?, Int?>? =
      row.multiColumnMixedOptional("dbcol.crafting_gold:quest_req", DbColumnCodec.StringCodec, DbColumnCodec.IntCodec).toTuple2()

  public val unlockVarbit: List<Tuple3<String, Int, Int>> =
      row.multiColumnMixedOptional("dbcol.crafting_gold:unlock_varbit", DbColumnCodec.StringCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val lockedMessage: String? = row.stringOptional("dbcol.crafting_gold:locked_message")

  public val interfaceComponent: String = row.string("dbcol.crafting_gold:interface_component")

  public val interfaceSlot: Int = row.int("dbcol.crafting_gold:interface_slot")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CraftingGoldRow> by
        lazy { DbHelper.table("dbtable.crafting_gold").map { CraftingGoldRow(it) } }

    public fun all(): List<CraftingGoldRow> = cachedAll

    public fun getRow(row: Int): CraftingGoldRow = CraftingGoldRow(DbHelper.row(row))

    public fun getRow(column: String): CraftingGoldRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
