// AUTO-GENERATED for dbtable.sotfa_forest_encounter — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SotfaForestEncounterRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.sotfa_forest_encounter:id")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SotfaForestEncounterRow> by
        lazy { DbHelper.table("dbtable.sotfa_forest_encounter").map { SotfaForestEncounterRow(it) } }

    public fun all(): List<SotfaForestEncounterRow> = cachedAll

    public fun getRow(row: Int): SotfaForestEncounterRow = SotfaForestEncounterRow(DbHelper.row(row))

    public fun getRow(column: String): SotfaForestEncounterRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
