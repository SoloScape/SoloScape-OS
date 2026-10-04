// AUTO-GENERATED for dbtable.cluehelper_challenge_question — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.multiColumnMixed
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class CluehelperChallengeQuestionRow(
  row: DbHelper,
) {
  public val question: List<Tuple2<String, Int>> =
      row.multiColumnMixed("dbcol.cluehelper_challenge_question:question", DbColumnCodec.StringCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperChallengeQuestionRow> by
        lazy { DbHelper.table("dbtable.cluehelper_challenge_question").map { CluehelperChallengeQuestionRow(it) } }

    public fun all(): List<CluehelperChallengeQuestionRow> = cachedAll

    public fun getRow(row: Int): CluehelperChallengeQuestionRow = CluehelperChallengeQuestionRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperChallengeQuestionRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
