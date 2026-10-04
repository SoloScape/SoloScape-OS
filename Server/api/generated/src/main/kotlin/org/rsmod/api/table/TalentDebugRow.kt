// AUTO-GENERATED for dbtable.talent_debug — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class TalentDebugRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<TalentDebugRow> by
        lazy { DbHelper.table("dbtable.talent_debug").map { TalentDebugRow(it) } }

    public fun all(): List<TalentDebugRow> = cachedAll

    public fun getRow(row: Int): TalentDebugRow = TalentDebugRow(DbHelper.row(row))

    public fun getRow(column: String): TalentDebugRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
