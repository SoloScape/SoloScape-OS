// AUTO-GENERATED for dbtable.poh_heraldic_decor_variant — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class PohHeraldicDecorVariantRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PohHeraldicDecorVariantRow> by
        lazy { DbHelper.table("dbtable.poh_heraldic_decor_variant").map { PohHeraldicDecorVariantRow(it) } }

    public fun all(): List<PohHeraldicDecorVariantRow> = cachedAll

    public fun getRow(row: Int): PohHeraldicDecorVariantRow = PohHeraldicDecorVariantRow(DbHelper.row(row))

    public fun getRow(column: String): PohHeraldicDecorVariantRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
