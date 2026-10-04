// AUTO-GENERATED for dbtable.quest — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.NpcServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.MapElementIdCodec
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.QuestRow
import org.rsmod.api.table.SpeedrunRow
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2
import org.rsmod.map.CoordGrid

public class QuestRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.quest:id")

  public val sortname: String = row.string("dbcol.quest:sortname")

  public val displayname: String = row.string("dbcol.quest:displayname")

  public val releaseType: Int? = row.intOptional("dbcol.quest:release_type")

  public val type: Int = row.int("dbcol.quest:type")

  public val members: Boolean = row.boolean("dbcol.quest:members")

  public val difficulty: Int = row.int("dbcol.quest:difficulty")

  public val length: Int = row.int("dbcol.quest:length")

  public val location: Int = row.int("dbcol.quest:location")

  public val releasedate: List<Int> =
      row.multiColumn("dbcol.quest:releasedate", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val series: Int? = row.intOptional("dbcol.quest:series")

  public val seriesno: Int? = row.intOptional("dbcol.quest:seriesno")

  public val seriesnoOverride: List<Tuple2<Boolean, String>> =
      row.multiColumnMixedOptional("dbcol.quest:seriesno_override", DbColumnCodec.BooleanCodec, DbColumnCodec.StringCodec).toListOfTuple2()

  public val startcoord: CoordGrid? =
      row.columnOptional("dbcol.quest:startcoord", DbColumnCodec.CoordGridCodec)

  public val startnpc: List<NpcServerType> =
      row.slotsOptional("dbcol.quest:startnpc", DbColumnCodec.NpcTypeCodec)

  public val startloc: ObjectServerType? =
      row.columnOptional("dbcol.quest:startloc", DbColumnCodec.LocTypeCodec)

  public val mapelement: Int? = row.columnOptional("dbcol.quest:mapelement", MapElementIdCodec)

  public val questpoints: Int = row.int("dbcol.quest:questpoints")

  public val unstartedstate: Int? = row.intOptional("dbcol.quest:unstartedstate")

  public val endstate: Int = row.int("dbcol.quest:endstate")

  public val parentQuest: QuestRow? by
      lazy { row.columnOptional("dbcol.quest:parent_quest", DbColumnCodec.DbRowTypeCodec)?.let { QuestRow.getRow(it.id) } }

  public val hasSubquests: Boolean? = row.booleanOptional("dbcol.quest:has_subquests")

  public val requirementStats: List<Tuple2<StatType, Int>> =
      row.multiColumnMixedOptional("dbcol.quest:requirement_stats", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val recommendedStats: List<Tuple2<StatType, Int>> =
      row.multiColumnMixedOptional("dbcol.quest:recommended_stats", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val requirementQuests: List<QuestRow> by
      lazy { row.slotsOptional("dbcol.quest:requirement_quests", DbColumnCodec.DbRowTypeCodec).map { QuestRow.getRow(it.id) } }

  public val requirementQuestpoints: Int? = row.intOptional("dbcol.quest:requirement_questpoints")

  public val requirementCombat: Int? = row.intOptional("dbcol.quest:requirement_combat")

  public val recommendedCombat: Int? = row.intOptional("dbcol.quest:recommended_combat")

  public val requirementCheckSkillsOnStart: Boolean? =
      row.booleanOptional("dbcol.quest:requirement_check_skills_on_start")

  public val requirementsBoostable: Boolean? =
      row.booleanOptional("dbcol.quest:requirements_boostable")

  public val speedrun: SpeedrunRow? by
      lazy { row.columnOptional("dbcol.quest:speedrun", DbColumnCodec.DbRowTypeCodec)?.let { SpeedrunRow.getRow(it.id) } }

  public val statXpAwarded: List<Tuple2<StatType, Int>> =
      row.multiColumnMixedOptional("dbcol.quest:stat_xp_awarded", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val prerequisiteDirect: Int? = row.intOptional("dbcol.quest:prerequisite_direct")

  public val prerequisiteIndirect: Int? = row.intOptional("dbcol.quest:prerequisite_indirect")

  public val ftueStarter: Int? = row.intOptional("dbcol.quest:ftue_starter")

  public val crCanRecommend: Boolean? = row.booleanOptional("dbcol.quest:cr_can_recommend")

  public val crExperienceProfile: Int? = row.intOptional("dbcol.quest:cr_experience_profile")

  public val crRecommendationReason: String? =
      row.stringOptional("dbcol.quest:cr_recommendation_reason")

  public val crRecommendationReasonIsPrimary: Boolean? =
      row.booleanOptional("dbcol.quest:cr_recommendation_reason_is_primary")

  public val restrictedContent: Int? = row.intOptional("dbcol.quest:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<QuestRow> by
        lazy { DbHelper.table("dbtable.quest").map { QuestRow(it) } }

    public fun all(): List<QuestRow> = cachedAll

    public fun getRow(row: Int): QuestRow = QuestRow(DbHelper.row(row))

    public fun getRow(column: String): QuestRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
