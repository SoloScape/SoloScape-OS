// AUTO-GENERATED for dbtable.skill_features — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.QuestRow
import org.rsmod.api.table.Tuple5
import org.rsmod.api.table.toListOfTuple5
import org.rsmod.api.table.toTuple5

public class SkillFeaturesRow(
  row: DbHelper,
) {
  public val icon: ItemServerType = row.obj("dbcol.skill_features:icon")

  public val sprite: List<Tuple5<Int, Int, Int, Int, Int>> =
      row.multiColumnMixedOptional("dbcol.skill_features:sprite", GraphicIdCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple5()

  public val text: String = row.string("dbcol.skill_features:text")

  public val skill: List<Int> =
      row.multiColumn("dbcol.skill_features:skill", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val quest: QuestRow? by
      lazy { row.columnOptional("dbcol.skill_features:quest", DbColumnCodec.DbRowTypeCodec)?.let { QuestRow.getRow(it.id) } }

  public val otherreq: String? = row.stringOptional("dbcol.skill_features:otherreq")

  public val membersonly: Boolean? = row.booleanOptional("dbcol.skill_features:membersonly")

  public val otherdataMagic: ItemServerType? =
      row.objOptional("dbcol.skill_features:otherdata_magic")

  public val otherdataSailing: ItemServerType? =
      row.objOptional("dbcol.skill_features:otherdata_sailing")

  public val otherdataConstruction: ItemServerType? =
      row.objOptional("dbcol.skill_features:otherdata_construction")

  public val customOrdering: Int? = row.intOptional("dbcol.skill_features:custom_ordering")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SkillFeaturesRow> by
        lazy { DbHelper.table("dbtable.skill_features").map { SkillFeaturesRow(it) } }

    public fun all(): List<SkillFeaturesRow> = cachedAll

    public fun getRow(row: Int): SkillFeaturesRow = SkillFeaturesRow(DbHelper.row(row))

    public fun getRow(column: String): SkillFeaturesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
