// AUTO-GENERATED for dbtable.sailing_bt_gwenith_glide_crystal_data — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingBtGwenithGlideCrystalDataRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBtGwenithGlideCrystalDataRow> by
        lazy { DbHelper.table("dbtable.sailing_bt_gwenith_glide_crystal_data").map { SailingBtGwenithGlideCrystalDataRow(it) } }

    public fun all(): List<SailingBtGwenithGlideCrystalDataRow> = cachedAll

    public fun getRow(row: Int): SailingBtGwenithGlideCrystalDataRow = SailingBtGwenithGlideCrystalDataRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBtGwenithGlideCrystalDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
