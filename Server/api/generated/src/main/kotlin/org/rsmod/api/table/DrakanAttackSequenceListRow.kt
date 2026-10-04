// AUTO-GENERATED for dbtable.drakan_attack_sequence_list — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DrakanAttackSequenceListRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DrakanAttackSequenceListRow> by
        lazy { DbHelper.table("dbtable.drakan_attack_sequence_list").map { DrakanAttackSequenceListRow(it) } }

    public fun all(): List<DrakanAttackSequenceListRow> = cachedAll

    public fun getRow(row: Int): DrakanAttackSequenceListRow = DrakanAttackSequenceListRow(DbHelper.row(row))

    public fun getRow(column: String): DrakanAttackSequenceListRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
