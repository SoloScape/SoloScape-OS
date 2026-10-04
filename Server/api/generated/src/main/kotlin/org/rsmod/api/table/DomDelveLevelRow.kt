// AUTO-GENERATED for dbtable.dom_delve_level — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DomDelveLevelRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DomDelveLevelRow> by
        lazy { DbHelper.table("dbtable.dom_delve_level").map { DomDelveLevelRow(it) } }

    public fun all(): List<DomDelveLevelRow> = cachedAll

    public fun getRow(row: Int): DomDelveLevelRow = DomDelveLevelRow(DbHelper.row(row))

    public fun getRow(column: String): DomDelveLevelRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
