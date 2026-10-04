// AUTO-GENERATED for dbtable.teleport_generic — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class TeleportGenericRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.teleport_generic:name")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<TeleportGenericRow> by
        lazy { DbHelper.table("dbtable.teleport_generic").map { TeleportGenericRow(it) } }

    public fun all(): List<TeleportGenericRow> = cachedAll

    public fun getRow(row: Int): TeleportGenericRow = TeleportGenericRow(DbHelper.row(row))

    public fun getRow(column: String): TeleportGenericRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
