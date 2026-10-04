// AUTO-GENERATED for dbtable.varlamore_thieving_house — do not edit.
package org.rsmod.api.table.thieving

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class VarlamoreThievingHouseRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<VarlamoreThievingHouseRow> by
        lazy { DbHelper.table("dbtable.varlamore_thieving_house").map { VarlamoreThievingHouseRow(it) } }

    public fun all(): List<VarlamoreThievingHouseRow> = cachedAll

    public fun getRow(row: Int): VarlamoreThievingHouseRow = VarlamoreThievingHouseRow(DbHelper.row(row))

    public fun getRow(column: String): VarlamoreThievingHouseRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
