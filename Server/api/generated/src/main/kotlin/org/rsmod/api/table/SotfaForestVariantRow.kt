// AUTO-GENERATED for dbtable.sotfa_forest_variant — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SotfaForestVariantRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SotfaForestVariantRow> by
        lazy { DbHelper.table("dbtable.sotfa_forest_variant").map { SotfaForestVariantRow(it) } }

    public fun all(): List<SotfaForestVariantRow> = cachedAll

    public fun getRow(row: Int): SotfaForestVariantRow = SotfaForestVariantRow(DbHelper.row(row))

    public fun getRow(column: String): SotfaForestVariantRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
