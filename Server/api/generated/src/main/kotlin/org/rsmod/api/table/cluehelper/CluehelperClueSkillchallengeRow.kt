// AUTO-GENERATED for dbtable.cluehelper_clue_skillchallenge — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.cluehelper.CluehelperRequirementStatRow
import org.rsmod.api.table.cluehelper.CluehelperTargetNpcRow

public class CluehelperClueSkillchallengeRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_skillchallenge:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_skillchallenge:difficulty")

  public val clueText: String = row.string("dbcol.cluehelper_clue_skillchallenge:clue_text")

  public val requirements: List<CluehelperRequirementStatRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_clue_skillchallenge:requirements", DbColumnCodec.DbRowTypeCodec).map { CluehelperRequirementStatRow.getRow(it.id) } }

  public val target: CluehelperTargetNpcRow? by
      lazy { row.columnOptional("dbcol.cluehelper_clue_skillchallenge:target", DbColumnCodec.DbRowTypeCodec)?.let { CluehelperTargetNpcRow.getRow(it.id) } }

  public val region: List<Int> =
      row.slotsOptional("dbcol.cluehelper_clue_skillchallenge:region", DbColumnCodec.IntCodec)

  public val allregions: Boolean? =
      row.booleanOptional("dbcol.cluehelper_clue_skillchallenge:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_skillchallenge:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueSkillchallengeRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_skillchallenge").map { CluehelperClueSkillchallengeRow(it) } }

    public fun all(): List<CluehelperClueSkillchallengeRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueSkillchallengeRow = CluehelperClueSkillchallengeRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueSkillchallengeRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
