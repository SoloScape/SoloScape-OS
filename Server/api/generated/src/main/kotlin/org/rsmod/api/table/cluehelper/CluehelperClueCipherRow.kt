// AUTO-GENERATED for dbtable.cluehelper_clue_cipher — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.definition.type.DBRowType
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
import org.rsmod.api.table.cluehelper.CluehelperTargetNpcRow

public class CluehelperClueCipherRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_cipher:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_cipher:difficulty")

  public val clueText: String = row.string("dbcol.cluehelper_clue_cipher:clue_text")

  public val target: List<CluehelperTargetNpcRow> by
      lazy { row.list("dbcol.cluehelper_clue_cipher:target", DbColumnCodec.DbRowTypeCodec).map { CluehelperTargetNpcRow.getRow(it.id) } }

  public val challenge: CluehelperChallengeQuestionRow? by
      lazy { row.columnOptional("dbcol.cluehelper_clue_cipher:challenge", DbColumnCodec.DbRowTypeCodec)?.let { CluehelperChallengeQuestionRow.getRow(it.id) } }

  public val requirements: DBRowType? =
      row.columnOptional("dbcol.cluehelper_clue_cipher:requirements", DbColumnCodec.DbRowTypeCodec)

  public val region: List<Int> =
      row.list("dbcol.cluehelper_clue_cipher:region", DbColumnCodec.IntCodec)

  public val allregions: Boolean? = row.booleanOptional("dbcol.cluehelper_clue_cipher:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_cipher:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueCipherRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_cipher").map { CluehelperClueCipherRow(it) } }

    public fun all(): List<CluehelperClueCipherRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueCipherRow = CluehelperClueCipherRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueCipherRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
