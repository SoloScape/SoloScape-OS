// AUTO-GENERATED for dbtable.ambient_sfx — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class AmbientSfxRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<AmbientSfxRow> by
        lazy { DbHelper.table("dbtable.ambient_sfx").map { AmbientSfxRow(it) } }

    public fun all(): List<AmbientSfxRow> = cachedAll

    public fun getRow(row: Int): AmbientSfxRow = AmbientSfxRow(DbHelper.row(row))

    public fun getRow(column: String): AmbientSfxRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
