// AUTO-GENERATED for dbtable.crafting_silver — do not edit.
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
import org.rsmod.api.table.toTuple2
import org.rsmod.api.table.toTuple3

public class CraftingSilverRow(
  row: DbHelper,
) {
  public val input: List<ItemServerType> =
      row.list("dbcol.crafting_silver:input", DbColumnCodec.ItemServerTypeCodec)

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.crafting_silver:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.crafting_silver:xp")

  public val output: ItemServerType = row.obj("dbcol.crafting_silver:output")

  public val category: String = row.string("dbcol.crafting_silver:category")

  public val inputAmount: List<Int> =
      row.list("dbcol.crafting_silver:input_amount", DbColumnCodec.IntCodec)

  public val outputAmount: Int = row.int("dbcol.crafting_silver:output_amount")

  public val section: String = row.string("dbcol.crafting_silver:section")

  public val successLow: Int? = row.intOptional("dbcol.crafting_silver:success_low")

  public val successHigh: Int? = row.intOptional("dbcol.crafting_silver:success_high")

  public val ticks: Int? = row.intOptional("dbcol.crafting_silver:ticks")

  public val failXp: Int? = row.intOptional("dbcol.crafting_silver:fail_xp")

  public val failItem: ItemServerType? = row.objOptional("dbcol.crafting_silver:fail_item")

  public val anim: String? = row.stringOptional("dbcol.crafting_silver:anim")

  public val spotanim: String? = row.stringOptional("dbcol.crafting_silver:spotanim")

  public val triggers: ItemServerType? = row.objOptional("dbcol.crafting_silver:triggers")

  public val xpExtra: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.crafting_silver:xp_extra", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val tool: ItemServerType = row.obj("dbcol.crafting_silver:tool")

  public val sound: String? = row.stringOptional("dbcol.crafting_silver:sound")

  public val message: String? = row.stringOptional("dbcol.crafting_silver:message")

  public val actionName: String? = row.stringOptional("dbcol.crafting_silver:action_name")

  public val confirmTitle: String? = row.stringOptional("dbcol.crafting_silver:confirm_title")

  public val confirmWarning: String? = row.stringOptional("dbcol.crafting_silver:confirm_warning")

  public val resultDialogue: String? = row.stringOptional("dbcol.crafting_silver:result_dialogue")

  public val questReq: Tuple2<String?, Int?>? =
      row.multiColumnMixedOptional("dbcol.crafting_silver:quest_req", DbColumnCodec.StringCodec, DbColumnCodec.IntCodec).toTuple2()

  public val unlockVarbit: Tuple3<String?, Int?, Int?>? =
      row.multiColumnMixedOptional("dbcol.crafting_silver:unlock_varbit", DbColumnCodec.StringCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toTuple3()

  public val lockedMessage: String? = row.stringOptional("dbcol.crafting_silver:locked_message")

  public val interfaceComponent: String = row.string("dbcol.crafting_silver:interface_component")

  public val interfaceSlot: Int = row.int("dbcol.crafting_silver:interface_slot")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CraftingSilverRow> by
        lazy { DbHelper.table("dbtable.crafting_silver").map { CraftingSilverRow(it) } }

    public fun all(): List<CraftingSilverRow> = cachedAll

    public fun getRow(row: Int): CraftingSilverRow = CraftingSilverRow(DbHelper.row(row))

    public fun getRow(column: String): CraftingSilverRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
