// AUTO-GENERATED for dbtable.reward — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.StructIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.QuestRow
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class RewardRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.reward:name")

  public val desc: String? = row.stringOptional("dbcol.reward:desc")

  public val showDerivedDesc: Boolean? = row.booleanOptional("dbcol.reward:show_derived_desc")

  public val displayGraphic: Int? =
      row.columnOptional("dbcol.reward:display_graphic", GraphicIdCodec)

  public val displayObject: ItemServerType? = row.objOptional("dbcol.reward:display_object")

  public val xpBoostPercentageAllStat: Int? =
      row.intOptional("dbcol.reward:xp_boost_percentage_all_stat")

  public val xpBoostPercentage: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.reward:xp_boost_percentage", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val questUnlock: List<QuestRow> by
      lazy { row.slotsOptional("dbcol.reward:quest_unlock", DbColumnCodec.DbRowTypeCodec).map { QuestRow.getRow(it.id) } }

  public val objectID: List<Tuple2<ItemServerType, Int>> =
      row.multiColumnMixedOptional("dbcol.reward:object", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val achievementDiaryUnlock: Int? = row.intOptional("dbcol.reward:achievement_diary_unlock")

  public val combatAchievementUnlock: Int? =
      row.intOptional("dbcol.reward:combat_achievement_unlock")

  public val leagueRelic: Int? = row.columnOptional("dbcol.reward:league_relic", StructIdCodec)

  public val combatMasteryTier: List<Int> =
      row.slotsOptional("dbcol.reward:combat_mastery_tier", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val reclaimable: Boolean? = row.booleanOptional("dbcol.reward:reclaimable")

  public val oncePerEvent: Boolean? = row.booleanOptional("dbcol.reward:once_per_event")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<RewardRow> by
        lazy { DbHelper.table("dbtable.reward").map { RewardRow(it) } }

    public fun all(): List<RewardRow> = cachedAll

    public fun getRow(row: Int): RewardRow = RewardRow(DbHelper.row(row))

    public fun getRow(column: String): RewardRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
