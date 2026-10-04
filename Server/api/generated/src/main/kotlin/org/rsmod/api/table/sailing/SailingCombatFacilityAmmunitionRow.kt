// AUTO-GENERATED for dbtable.sailing_combat_facility_ammunition — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingCombatFacilityAmmunitionRow(
  row: DbHelper,
) {
  public val ammunitionId: Int = row.int("dbcol.sailing_combat_facility_ammunition:ammunition_id")

  public val ammunitionObj: ItemServerType =
      row.obj("dbcol.sailing_combat_facility_ammunition:ammunition_obj")

  public val ammunitionType: Int? =
      row.intOptional("dbcol.sailing_combat_facility_ammunition:ammunition_type")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingCombatFacilityAmmunitionRow> by
        lazy { DbHelper.table("dbtable.sailing_combat_facility_ammunition").map { SailingCombatFacilityAmmunitionRow(it) } }

    public fun all(): List<SailingCombatFacilityAmmunitionRow> = cachedAll

    public fun getRow(row: Int): SailingCombatFacilityAmmunitionRow = SailingCombatFacilityAmmunitionRow(DbHelper.row(row))

    public fun getRow(column: String): SailingCombatFacilityAmmunitionRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
