// AUTO-GENERATED for dbtable.woodcutting_basic_resource_data — do not edit.
package org.rsmod.api.table.woodcutting

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class WoodcuttingBasicResourceDataRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<WoodcuttingBasicResourceDataRow> by
        lazy { DbHelper.table("dbtable.woodcutting_basic_resource_data").map { WoodcuttingBasicResourceDataRow(it) } }

    public fun all(): List<WoodcuttingBasicResourceDataRow> = cachedAll

    public fun getRow(row: Int): WoodcuttingBasicResourceDataRow = WoodcuttingBasicResourceDataRow(DbHelper.row(row))

    public fun getRow(column: String): WoodcuttingBasicResourceDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
