// AUTO-GENERATED for dbtable.cluehelper_clue_anagram — do not edit.
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
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.cluehelper.CluehelperChallengeQuestionRow
import org.rsmod.api.table.cluehelper.CluehelperRequirementQuestRow
import org.rsmod.api.table.cluehelper.CluehelperTargetNpcRow

public class CluehelperClueAnagramRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_anagram:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_anagram:difficulty")

  public val clueText: String = row.string("dbcol.cluehelper_clue_anagram:clue_text")

  public val target: List<CluehelperTargetNpcRow> by
      lazy { row.list("dbcol.cluehelper_clue_anagram:target", DbColumnCodec.DbRowTypeCodec).map { CluehelperTargetNpcRow.getRow(it.id) } }

  public val challenge: CluehelperChallengeQuestionRow? by
      lazy { row.columnOptional("dbcol.cluehelper_clue_anagram:challenge", DbColumnCodec.DbRowTypeCodec)?.let { CluehelperChallengeQuestionRow.getRow(it.id) } }

  public val region: List<Int> =
      row.list("dbcol.cluehelper_clue_anagram:region", DbColumnCodec.IntCodec)

  public val requirements: CluehelperRequirementQuestRow? by
      lazy { row.columnOptional("dbcol.cluehelper_clue_anagram:requirements", DbColumnCodec.DbRowTypeCodec)?.let { CluehelperRequirementQuestRow.getRow(it.id) } }

  public val allregions: Boolean? = row.booleanOptional("dbcol.cluehelper_clue_anagram:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_anagram:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueAnagramRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_anagram").map { CluehelperClueAnagramRow(it) } }

    public fun all(): List<CluehelperClueAnagramRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueAnagramRow = CluehelperClueAnagramRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueAnagramRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
