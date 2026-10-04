// AUTO-GENERATED for dbtable.drakan_attack_list — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DrakanAttackListRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DrakanAttackListRow> by
        lazy { DbHelper.table("dbtable.drakan_attack_list").map { DrakanAttackListRow(it) } }

    public fun all(): List<DrakanAttackListRow> = cachedAll

    public fun getRow(row: Int): DrakanAttackListRow = DrakanAttackListRow(DbHelper.row(row))

    public fun getRow(column: String): DrakanAttackListRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
