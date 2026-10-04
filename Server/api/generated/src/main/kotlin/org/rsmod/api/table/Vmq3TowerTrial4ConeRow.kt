// AUTO-GENERATED for dbtable.vmq3_tower_trial_4_cone — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Vmq3TowerTrial4ConeRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Vmq3TowerTrial4ConeRow> by
        lazy { DbHelper.table("dbtable.vmq3_tower_trial_4_cone").map { Vmq3TowerTrial4ConeRow(it) } }

    public fun all(): List<Vmq3TowerTrial4ConeRow> = cachedAll

    public fun getRow(row: Int): Vmq3TowerTrial4ConeRow = Vmq3TowerTrial4ConeRow(DbHelper.row(row))

    public fun getRow(column: String): Vmq3TowerTrial4ConeRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
