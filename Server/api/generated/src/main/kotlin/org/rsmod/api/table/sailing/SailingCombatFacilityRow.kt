// AUTO-GENERATED for dbtable.sailing_combat_facility — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingCombatFacilityRow(
  row: DbHelper,
) {
  public val dummyObj: ItemServerType = row.obj("dbcol.sailing_combat_facility:dummy_obj")

  public val rangedLevelRequired: Int =
      row.int("dbcol.sailing_combat_facility:ranged_level_required")

  public val accuracy: Int = row.int("dbcol.sailing_combat_facility:accuracy")

  public val damage: Int = row.int("dbcol.sailing_combat_facility:damage")

  public val ammunitionMaxTier: Int = row.int("dbcol.sailing_combat_facility:ammunition_max_tier")

  public val attackRate: Int = row.int("dbcol.sailing_combat_facility:attack_rate")

  public val attackRange: Int = row.int("dbcol.sailing_combat_facility:attack_range")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingCombatFacilityRow> by
        lazy { DbHelper.table("dbtable.sailing_combat_facility").map { SailingCombatFacilityRow(it) } }

    public fun all(): List<SailingCombatFacilityRow> = cachedAll

    public fun getRow(row: Int): SailingCombatFacilityRow = SailingCombatFacilityRow(DbHelper.row(row))

    public fun getRow(column: String): SailingCombatFacilityRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
