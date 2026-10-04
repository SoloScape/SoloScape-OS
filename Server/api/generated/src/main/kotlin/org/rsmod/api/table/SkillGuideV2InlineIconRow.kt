// AUTO-GENERATED for dbtable.skill_guide_v2_inline_icon — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SkillGuideV2InlineIconRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.skill_guide_v2_inline_icon:id")

  public val graphic: Int = row.column("dbcol.skill_guide_v2_inline_icon:graphic", GraphicIdCodec)

  public val size: List<Int> =
      row.multiColumn("dbcol.skill_guide_v2_inline_icon:size", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val offset: List<Int> =
      row.slotsOptional("dbcol.skill_guide_v2_inline_icon:offset", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val margin: List<Int> =
      row.slotsOptional("dbcol.skill_guide_v2_inline_icon:margin", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SkillGuideV2InlineIconRow> by
        lazy { DbHelper.table("dbtable.skill_guide_v2_inline_icon").map { SkillGuideV2InlineIconRow(it) } }

    public fun all(): List<SkillGuideV2InlineIconRow> = cachedAll

    public fun getRow(row: Int): SkillGuideV2InlineIconRow = SkillGuideV2InlineIconRow(DbHelper.row(row))

    public fun getRow(column: String): SkillGuideV2InlineIconRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
