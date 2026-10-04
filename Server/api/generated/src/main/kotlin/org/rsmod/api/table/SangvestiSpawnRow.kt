// AUTO-GENERATED for dbtable.sangvesti_spawn — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SangvestiSpawnRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SangvestiSpawnRow> by
        lazy { DbHelper.table("dbtable.sangvesti_spawn").map { SangvestiSpawnRow(it) } }

    public fun all(): List<SangvestiSpawnRow> = cachedAll

    public fun getRow(row: Int): SangvestiSpawnRow = SangvestiSpawnRow(DbHelper.row(row))

    public fun getRow(column: String): SangvestiSpawnRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
