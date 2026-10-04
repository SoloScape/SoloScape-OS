// AUTO-GENERATED for dbtable.cowboss_scenerynpcs — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CowbossScenerynpcsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CowbossScenerynpcsRow> by
        lazy { DbHelper.table("dbtable.cowboss_scenerynpcs").map { CowbossScenerynpcsRow(it) } }

    public fun all(): List<CowbossScenerynpcsRow> = cachedAll

    public fun getRow(row: Int): CowbossScenerynpcsRow = CowbossScenerynpcsRow(DbHelper.row(row))

    public fun getRow(column: String): CowbossScenerynpcsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
