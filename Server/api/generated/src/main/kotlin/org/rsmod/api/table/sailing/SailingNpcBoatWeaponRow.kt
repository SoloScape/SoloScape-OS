// AUTO-GENERATED for dbtable.sailing_npc_boat_weapon — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingNpcBoatWeaponRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingNpcBoatWeaponRow> by
        lazy { DbHelper.table("dbtable.sailing_npc_boat_weapon").map { SailingNpcBoatWeaponRow(it) } }

    public fun all(): List<SailingNpcBoatWeaponRow> = cachedAll

    public fun getRow(row: Int): SailingNpcBoatWeaponRow = SailingNpcBoatWeaponRow(DbHelper.row(row))

    public fun getRow(column: String): SailingNpcBoatWeaponRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
