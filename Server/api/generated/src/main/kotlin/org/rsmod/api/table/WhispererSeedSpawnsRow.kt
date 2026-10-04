// AUTO-GENERATED for dbtable.whisperer_seed_spawns — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class WhispererSeedSpawnsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<WhispererSeedSpawnsRow> by
        lazy { DbHelper.table("dbtable.whisperer_seed_spawns").map { WhispererSeedSpawnsRow(it) } }

    public fun all(): List<WhispererSeedSpawnsRow> = cachedAll

    public fun getRow(row: Int): WhispererSeedSpawnsRow = WhispererSeedSpawnsRow(DbHelper.row(row))

    public fun getRow(column: String): WhispererSeedSpawnsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
