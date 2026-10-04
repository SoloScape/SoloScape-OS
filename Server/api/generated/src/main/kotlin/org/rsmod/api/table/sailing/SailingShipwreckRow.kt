// AUTO-GENERATED for dbtable.sailing_shipwreck — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingShipwreckRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingShipwreckRow> by
        lazy { DbHelper.table("dbtable.sailing_shipwreck").map { SailingShipwreckRow(it) } }

    public fun all(): List<SailingShipwreckRow> = cachedAll

    public fun getRow(row: Int): SailingShipwreckRow = SailingShipwreckRow(DbHelper.row(row))

    public fun getRow(column: String): SailingShipwreckRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
