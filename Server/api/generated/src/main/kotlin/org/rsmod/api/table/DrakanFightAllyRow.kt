// AUTO-GENERATED for dbtable.drakan_fight_ally — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DrakanFightAllyRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DrakanFightAllyRow> by
        lazy { DbHelper.table("dbtable.drakan_fight_ally").map { DrakanFightAllyRow(it) } }

    public fun all(): List<DrakanFightAllyRow> = cachedAll

    public fun getRow(row: Int): DrakanFightAllyRow = DrakanFightAllyRow(DbHelper.row(row))

    public fun getRow(column: String): DrakanFightAllyRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
