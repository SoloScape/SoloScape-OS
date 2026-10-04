// AUTO-GENERATED for dbtable.omnishop_purse_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class OmnishopPurseDataRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<OmnishopPurseDataRow> by
        lazy { DbHelper.table("dbtable.omnishop_purse_data").map { OmnishopPurseDataRow(it) } }

    public fun all(): List<OmnishopPurseDataRow> = cachedAll

    public fun getRow(row: Int): OmnishopPurseDataRow = OmnishopPurseDataRow(DbHelper.row(row))

    public fun getRow(column: String): OmnishopPurseDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
