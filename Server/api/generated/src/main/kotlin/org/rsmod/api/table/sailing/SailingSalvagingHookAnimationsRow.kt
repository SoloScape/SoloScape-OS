// AUTO-GENERATED for dbtable.sailing_salvaging_hook_animations — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingSalvagingHookAnimationsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingSalvagingHookAnimationsRow> by
        lazy { DbHelper.table("dbtable.sailing_salvaging_hook_animations").map { SailingSalvagingHookAnimationsRow(it) } }

    public fun all(): List<SailingSalvagingHookAnimationsRow> = cachedAll

    public fun getRow(row: Int): SailingSalvagingHookAnimationsRow = SailingSalvagingHookAnimationsRow(DbHelper.row(row))

    public fun getRow(column: String): SailingSalvagingHookAnimationsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
