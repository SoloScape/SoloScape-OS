// AUTO-GENERATED for dbtable.hiscores_skill_info — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class HiscoresSkillInfoRow(
  row: DbHelper,
) {
  public val skillname: String = row.string("dbcol.hiscores_skill_info:skillname")

  public val skillid: Int = row.int("dbcol.hiscores_skill_info:skillid")

  public val skillicon: Int = row.column("dbcol.hiscores_skill_info:skillicon", GraphicIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<HiscoresSkillInfoRow> by
        lazy { DbHelper.table("dbtable.hiscores_skill_info").map { HiscoresSkillInfoRow(it) } }

    public fun all(): List<HiscoresSkillInfoRow> = cachedAll

    public fun getRow(row: Int): HiscoresSkillInfoRow = HiscoresSkillInfoRow(DbHelper.row(row))

    public fun getRow(column: String): HiscoresSkillInfoRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
