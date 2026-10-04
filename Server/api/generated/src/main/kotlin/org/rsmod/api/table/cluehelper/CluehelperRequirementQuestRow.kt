// AUTO-GENERATED for dbtable.cluehelper_requirement_quest — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.QuestRow

public class CluehelperRequirementQuestRow(
  row: DbHelper,
) {
  public val description: String = row.string("dbcol.cluehelper_requirement_quest:description")

  public val quest: QuestRow by
      lazy { QuestRow.getRow(row.dbRow("dbcol.cluehelper_requirement_quest:quest").id) }

  public val varstate: Int = row.int("dbcol.cluehelper_requirement_quest:varstate")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperRequirementQuestRow> by
        lazy { DbHelper.table("dbtable.cluehelper_requirement_quest").map { CluehelperRequirementQuestRow(it) } }

    public fun all(): List<CluehelperRequirementQuestRow> = cachedAll

    public fun getRow(row: Int): CluehelperRequirementQuestRow = CluehelperRequirementQuestRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperRequirementQuestRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
