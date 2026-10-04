// AUTO-GENERATED for dbtable.crafting_facilities — do not edit.
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

public class CraftingFacilitiesRow(
  row: DbHelper,
) {
  public val input: List<ItemServerType> =
      row.list("dbcol.crafting_facilities:input", DbColumnCodec.ItemServerTypeCodec)

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.crafting_facilities:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.crafting_facilities:xp")

  public val output: List<ItemServerType> =
      row.list("dbcol.crafting_facilities:output", DbColumnCodec.ItemServerTypeCodec)

  public val category: String = row.string("dbcol.crafting_facilities:category")

  public val inputAmount: List<Int> =
      row.list("dbcol.crafting_facilities:input_amount", DbColumnCodec.IntCodec)

  public val outputAmount: List<Int> =
      row.list("dbcol.crafting_facilities:output_amount", DbColumnCodec.IntCodec)

  public val section: String = row.string("dbcol.crafting_facilities:section")

  public val successLow: Int? = row.intOptional("dbcol.crafting_facilities:success_low")

  public val successHigh: Int? = row.intOptional("dbcol.crafting_facilities:success_high")

  public val ticks: Int? = row.intOptional("dbcol.crafting_facilities:ticks")

  public val failXp: Int? = row.intOptional("dbcol.crafting_facilities:fail_xp")

  public val failItem: ItemServerType? = row.objOptional("dbcol.crafting_facilities:fail_item")

  public val anim: String? = row.stringOptional("dbcol.crafting_facilities:anim")

  public val spotanim: String? = row.stringOptional("dbcol.crafting_facilities:spotanim")

  public val triggers: ItemServerType? = row.objOptional("dbcol.crafting_facilities:triggers")

  public val xpExtra: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.crafting_facilities:xp_extra", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val tool: ItemServerType? = row.objOptional("dbcol.crafting_facilities:tool")

  public val sound: String? = row.stringOptional("dbcol.crafting_facilities:sound")

  public val message: String? = row.stringOptional("dbcol.crafting_facilities:message")

  public val actionName: String? = row.stringOptional("dbcol.crafting_facilities:action_name")

  public val confirmTitle: String? = row.stringOptional("dbcol.crafting_facilities:confirm_title")

  public val confirmWarning: String? =
      row.stringOptional("dbcol.crafting_facilities:confirm_warning")

  public val resultDialogue: String? =
      row.stringOptional("dbcol.crafting_facilities:result_dialogue")

  public val questReq: Tuple2<String?, Int?>? =
      row.multiColumnMixedOptional("dbcol.crafting_facilities:quest_req", DbColumnCodec.StringCodec, DbColumnCodec.IntCodec).toTuple2()

  public val unlockVarbit: Tuple3<String?, Int?, Int?>? =
      row.multiColumnMixedOptional("dbcol.crafting_facilities:unlock_varbit", DbColumnCodec.StringCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toTuple3()

  public val lockedMessage: String? = row.stringOptional("dbcol.crafting_facilities:locked_message")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CraftingFacilitiesRow> by
        lazy { DbHelper.table("dbtable.crafting_facilities").map { CraftingFacilitiesRow(it) } }

    public fun all(): List<CraftingFacilitiesRow> = cachedAll

    public fun getRow(row: Int): CraftingFacilitiesRow = CraftingFacilitiesRow(DbHelper.row(row))

    public fun getRow(column: String): CraftingFacilitiesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
