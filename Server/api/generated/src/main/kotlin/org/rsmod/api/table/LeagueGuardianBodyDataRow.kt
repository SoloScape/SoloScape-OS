// AUTO-GENERATED for dbtable.league_guardian_body_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class LeagueGuardianBodyDataRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<LeagueGuardianBodyDataRow> by
        lazy { DbHelper.table("dbtable.league_guardian_body_data").map { LeagueGuardianBodyDataRow(it) } }

    public fun all(): List<LeagueGuardianBodyDataRow> = cachedAll

    public fun getRow(row: Int): LeagueGuardianBodyDataRow = LeagueGuardianBodyDataRow(DbHelper.row(row))

    public fun getRow(column: String): LeagueGuardianBodyDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
