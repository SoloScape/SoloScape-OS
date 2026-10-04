// AUTO-GENERATED for dbtable.varlamore_wyrm_agility_route — do not edit.
package org.rsmod.api.table.agility

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class VarlamoreWyrmAgilityRouteRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<VarlamoreWyrmAgilityRouteRow> by
        lazy { DbHelper.table("dbtable.varlamore_wyrm_agility_route").map { VarlamoreWyrmAgilityRouteRow(it) } }

    public fun all(): List<VarlamoreWyrmAgilityRouteRow> = cachedAll

    public fun getRow(row: Int): VarlamoreWyrmAgilityRouteRow = VarlamoreWyrmAgilityRouteRow(DbHelper.row(row))

    public fun getRow(column: String): VarlamoreWyrmAgilityRouteRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
