// AUTO-GENERATED for dbtable.league_guardian_anim_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class LeagueGuardianAnimDataRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<LeagueGuardianAnimDataRow> by
        lazy { DbHelper.table("dbtable.league_guardian_anim_data").map { LeagueGuardianAnimDataRow(it) } }

    public fun all(): List<LeagueGuardianAnimDataRow> = cachedAll

    public fun getRow(row: Int): LeagueGuardianAnimDataRow = LeagueGuardianAnimDataRow(DbHelper.row(row))

    public fun getRow(column: String): LeagueGuardianAnimDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
