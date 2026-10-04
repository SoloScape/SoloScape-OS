// AUTO-GENERATED for dbtable.misc_woodcutting_resource_data — do not edit.
package org.rsmod.api.table.woodcutting

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class MiscWoodcuttingResourceDataRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<MiscWoodcuttingResourceDataRow> by
        lazy { DbHelper.table("dbtable.misc_woodcutting_resource_data").map { MiscWoodcuttingResourceDataRow(it) } }

    public fun all(): List<MiscWoodcuttingResourceDataRow> = cachedAll

    public fun getRow(row: Int): MiscWoodcuttingResourceDataRow = MiscWoodcuttingResourceDataRow(DbHelper.row(row))

    public fun getRow(column: String): MiscWoodcuttingResourceDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
