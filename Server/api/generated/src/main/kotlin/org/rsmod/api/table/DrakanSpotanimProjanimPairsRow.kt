// AUTO-GENERATED for dbtable.drakan_spotanim_projanim_pairs — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DrakanSpotanimProjanimPairsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DrakanSpotanimProjanimPairsRow> by
        lazy { DbHelper.table("dbtable.drakan_spotanim_projanim_pairs").map { DrakanSpotanimProjanimPairsRow(it) } }

    public fun all(): List<DrakanSpotanimProjanimPairsRow> = cachedAll

    public fun getRow(row: Int): DrakanSpotanimProjanimPairsRow = DrakanSpotanimProjanimPairsRow(DbHelper.row(row))

    public fun getRow(column: String): DrakanSpotanimProjanimPairsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
