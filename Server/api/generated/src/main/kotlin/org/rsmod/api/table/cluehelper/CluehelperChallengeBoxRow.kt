// AUTO-GENERATED for dbtable.cluehelper_challenge_box — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CluehelperChallengeBoxRow(
  row: DbHelper,
) {
  public val description: String = row.string("dbcol.cluehelper_challenge_box:description")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperChallengeBoxRow> by
        lazy { DbHelper.table("dbtable.cluehelper_challenge_box").map { CluehelperChallengeBoxRow(it) } }

    public fun all(): List<CluehelperChallengeBoxRow> = cachedAll

    public fun getRow(row: Int): CluehelperChallengeBoxRow = CluehelperChallengeBoxRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperChallengeBoxRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
