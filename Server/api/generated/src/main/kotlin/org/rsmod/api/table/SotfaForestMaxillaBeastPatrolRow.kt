// AUTO-GENERATED for dbtable.sotfa_forest_maxilla_beast_patrol — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SotfaForestMaxillaBeastPatrolRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SotfaForestMaxillaBeastPatrolRow> by
        lazy { DbHelper.table("dbtable.sotfa_forest_maxilla_beast_patrol").map { SotfaForestMaxillaBeastPatrolRow(it) } }

    public fun all(): List<SotfaForestMaxillaBeastPatrolRow> = cachedAll

    public fun getRow(row: Int): SotfaForestMaxillaBeastPatrolRow = SotfaForestMaxillaBeastPatrolRow(DbHelper.row(row))

    public fun getRow(column: String): SotfaForestMaxillaBeastPatrolRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
