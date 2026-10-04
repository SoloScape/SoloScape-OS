// AUTO-GENERATED for dbtable.skill_guide_subsections — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class SkillGuideSubsectionsRow(
  row: DbHelper,
) {
  public val skill: Int = row.int("dbcol.skill_guide_subsections:skill")

  public val id: Int = row.int("dbcol.skill_guide_subsections:id")

  public val `header`: String = row.string("dbcol.skill_guide_subsections:header")

  public val membersonly: Boolean = row.boolean("dbcol.skill_guide_subsections:membersonly")

  public val customOrder: List<Tuple2<Boolean, Int>> =
      row.multiColumnMixedOptional("dbcol.skill_guide_subsections:custom_order", DbColumnCodec.BooleanCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SkillGuideSubsectionsRow> by
        lazy { DbHelper.table("dbtable.skill_guide_subsections").map { SkillGuideSubsectionsRow(it) } }

    public fun all(): List<SkillGuideSubsectionsRow> = cachedAll

    public fun getRow(row: Int): SkillGuideSubsectionsRow = SkillGuideSubsectionsRow(DbHelper.row(row))

    public fun getRow(column: String): SkillGuideSubsectionsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
