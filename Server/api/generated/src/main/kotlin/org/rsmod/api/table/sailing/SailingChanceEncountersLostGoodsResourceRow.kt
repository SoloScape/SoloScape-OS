// AUTO-GENERATED for dbtable.sailing_chance_encounters_lost_goods_resource — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingChanceEncountersLostGoodsResourceRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingChanceEncountersLostGoodsResourceRow> by
        lazy { DbHelper.table("dbtable.sailing_chance_encounters_lost_goods_resource").map { SailingChanceEncountersLostGoodsResourceRow(it) } }

    public fun all(): List<SailingChanceEncountersLostGoodsResourceRow> = cachedAll

    public fun getRow(row: Int): SailingChanceEncountersLostGoodsResourceRow = SailingChanceEncountersLostGoodsResourceRow(DbHelper.row(row))

    public fun getRow(column: String): SailingChanceEncountersLostGoodsResourceRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
