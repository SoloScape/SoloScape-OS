// AUTO-GENERATED for dbtable.sailing_chance_encounters_lost_goods — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingChanceEncountersLostGoodsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingChanceEncountersLostGoodsRow> by
        lazy { DbHelper.table("dbtable.sailing_chance_encounters_lost_goods").map { SailingChanceEncountersLostGoodsRow(it) } }

    public fun all(): List<SailingChanceEncountersLostGoodsRow> = cachedAll

    public fun getRow(row: Int): SailingChanceEncountersLostGoodsRow = SailingChanceEncountersLostGoodsRow(DbHelper.row(row))

    public fun getRow(column: String): SailingChanceEncountersLostGoodsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
