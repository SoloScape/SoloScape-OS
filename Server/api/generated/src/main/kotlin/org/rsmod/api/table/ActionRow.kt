// AUTO-GENERATED for dbtable.action — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.NpcServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.CategoryIdCodec
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.StructIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.npcOptional
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.ActionRow
import org.rsmod.api.table.FurnitureRow
import org.rsmod.api.table.QuestRow
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class ActionRow(
  row: DbHelper,
) {
  public val actionName: String = row.string("dbcol.action:action_name")

  public val actionDesc: String? = row.stringOptional("dbcol.action:action_desc")

  public val actionDisplayGraphic: Int? =
      row.columnOptional("dbcol.action:action_display_graphic", GraphicIdCodec)

  public val actionDisplayObject: ItemServerType? =
      row.objOptional("dbcol.action:action_display_object")

  public val actionDisplayDesc: List<String> =
      row.slotsOptional("dbcol.action:action_display_desc", DbColumnCodec.StringCodec, DbColumnCodec.StringCodec)

  public val actionDisplayShowDerivedDesc: Boolean? =
      row.booleanOptional("dbcol.action:action_display_show_derived_desc")

  public val customTracking: Boolean? = row.booleanOptional("dbcol.action:custom_tracking")

  public val bossKill: List<NpcServerType> =
      row.slotsOptional("dbcol.action:boss_kill", DbColumnCodec.NpcTypeCodec)

  public val bossKillCategory: Int? =
      row.columnOptional("dbcol.action:boss_kill_category", CategoryIdCodec)

  public val bossKillExtras: List<Boolean> =
      row.slotsOptional("dbcol.action:boss_kill_extras", DbColumnCodec.BooleanCodec, DbColumnCodec.BooleanCodec)

  public val npcKill: List<NpcServerType> =
      row.slotsOptional("dbcol.action:npc_kill", DbColumnCodec.NpcTypeCodec)

  public val npcKillCategory: List<Int> =
      row.slotsOptional("dbcol.action:npc_kill_category", CategoryIdCodec)

  public val npcKillSlayerCategory: Int? = row.intOptional("dbcol.action:npc_kill_slayer_category")

  public val equipItem: List<ItemServerType> =
      row.slotsOptional("dbcol.action:equip_item", DbColumnCodec.ItemServerTypeCodec)

  public val totalLevel: Int? = row.intOptional("dbcol.action:total_level")

  public val level: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.action:level", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val collectionGeneric: List<ItemServerType> =
      row.slotsOptional("dbcol.action:collection_generic", DbColumnCodec.ItemServerTypeCodec)

  public val collectionSpecific: Int? =
      row.columnOptional("dbcol.action:collection_specific", StructIdCodec)

  public val lootDrop: List<ItemServerType> =
      row.slotsOptional("dbcol.action:loot_drop", DbColumnCodec.ItemServerTypeCodec)

  public val lootDropSpecificNpc: NpcServerType? =
      row.npcOptional("dbcol.action:loot_drop_specific_npc")

  public val quest: QuestRow? by
      lazy { row.columnOptional("dbcol.action:quest", DbColumnCodec.DbRowTypeCodec)?.let { QuestRow.getRow(it.id) } }

  public val mineOre: List<ItemServerType> =
      row.slotsOptional("dbcol.action:mine_ore", DbColumnCodec.ItemServerTypeCodec)

  public val catchFish: ItemServerType? = row.objOptional("dbcol.action:catch_fish")

  public val hunter: List<Tuple2<ItemServerType, Boolean>> =
      row.multiColumnMixedOptional("dbcol.action:hunter", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.BooleanCodec).toListOfTuple2()

  public val pohBuild: FurnitureRow? by
      lazy { row.columnOptional("dbcol.action:poh_build", DbColumnCodec.DbRowTypeCodec)?.let { FurnitureRow.getRow(it.id) } }

  public val pohSetPortal: Int? = row.intOptional("dbcol.action:poh_set_portal")

  public val createItem: ItemServerType? = row.objOptional("dbcol.action:create_item")

  public val chopLogs: ItemServerType? = row.objOptional("dbcol.action:chop_logs")

  public val leaguesTask: ActionRow? by
      lazy { row.columnOptional("dbcol.action:leagues_task", DbColumnCodec.DbRowTypeCodec)?.let { ActionRow.getRow(it.id) } }

  public val childAction: List<ActionRow> by
      lazy { row.slotsOptional("dbcol.action:child_action", DbColumnCodec.DbRowTypeCodec).map { ActionRow.getRow(it.id) } }

  public val actionDifficulty: Int? = row.intOptional("dbcol.action:action_difficulty")

  public val leagueTrackingId: Int? = row.intOptional("dbcol.action:league_tracking_id")

  public val inCurrentLeague: Boolean? = row.booleanOptional("dbcol.action:in_current_league")

  public val category: Int? = row.intOptional("dbcol.action:category")

  public val taskArea: Int? = row.intOptional("dbcol.action:task_area")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ActionRow> by
        lazy { DbHelper.table("dbtable.action").map { ActionRow(it) } }

    public fun all(): List<ActionRow> = cachedAll

    public fun getRow(row: Int): ActionRow = ActionRow(DbHelper.row(row))

    public fun getRow(column: String): ActionRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
