// AUTO-GENERATED for dbtable.dom_droptable — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DomDroptableRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DomDroptableRow> by
        lazy { DbHelper.table("dbtable.dom_droptable").map { DomDroptableRow(it) } }

    public fun all(): List<DomDroptableRow> = cachedAll

    public fun getRow(row: Int): DomDroptableRow = DomDroptableRow(DbHelper.row(row))

    public fun getRow(column: String): DomDroptableRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
