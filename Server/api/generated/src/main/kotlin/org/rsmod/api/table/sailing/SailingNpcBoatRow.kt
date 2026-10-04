// AUTO-GENERATED for dbtable.sailing_npc_boat — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingNpcBoatRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingNpcBoatRow> by
        lazy { DbHelper.table("dbtable.sailing_npc_boat").map { SailingNpcBoatRow(it) } }

    public fun all(): List<SailingNpcBoatRow> = cachedAll

    public fun getRow(row: Int): SailingNpcBoatRow = SailingNpcBoatRow(DbHelper.row(row))

    public fun getRow(column: String): SailingNpcBoatRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
