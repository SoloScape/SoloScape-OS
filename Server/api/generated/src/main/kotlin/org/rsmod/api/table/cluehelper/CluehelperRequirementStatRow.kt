// AUTO-GENERATED for dbtable.cluehelper_requirement_stat — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.stat
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CluehelperRequirementStatRow(
  row: DbHelper,
) {
  public val stat: StatType = row.stat("dbcol.cluehelper_requirement_stat:stat")

  public val level: Int = row.int("dbcol.cluehelper_requirement_stat:level")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperRequirementStatRow> by
        lazy { DbHelper.table("dbtable.cluehelper_requirement_stat").map { CluehelperRequirementStatRow(it) } }

    public fun all(): List<CluehelperRequirementStatRow> = cachedAll

    public fun getRow(row: Int): CluehelperRequirementStatRow = CluehelperRequirementStatRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperRequirementStatRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
