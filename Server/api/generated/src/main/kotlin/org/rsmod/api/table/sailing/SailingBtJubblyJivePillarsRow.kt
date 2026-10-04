// AUTO-GENERATED for dbtable.sailing_bt_jubbly_jive_pillars — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingBtJubblyJivePillarsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBtJubblyJivePillarsRow> by
        lazy { DbHelper.table("dbtable.sailing_bt_jubbly_jive_pillars").map { SailingBtJubblyJivePillarsRow(it) } }

    public fun all(): List<SailingBtJubblyJivePillarsRow> = cachedAll

    public fun getRow(row: Int): SailingBtJubblyJivePillarsRow = SailingBtJubblyJivePillarsRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBtJubblyJivePillarsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
