// AUTO-GENERATED for dbtable.combat_interface_weapon_category — do not edit.
package org.rsmod.api.table.combat

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixed
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple4
import org.rsmod.api.table.toListOfTuple4
import org.rsmod.api.table.toTuple4

public class CombatInterfaceWeaponCategoryRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.combat_interface_weapon_category:id")

  public val button: List<Tuple4<Int, String, String, Int>> =
      row.multiColumnMixed("dbcol.combat_interface_weapon_category:button", DbColumnCodec.IntCodec, DbColumnCodec.StringCodec, DbColumnCodec.StringCodec, GraphicIdCodec).toListOfTuple4()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CombatInterfaceWeaponCategoryRow> by
        lazy { DbHelper.table("dbtable.combat_interface_weapon_category").map { CombatInterfaceWeaponCategoryRow(it) } }

    public fun all(): List<CombatInterfaceWeaponCategoryRow> = cachedAll

    public fun getRow(row: Int): CombatInterfaceWeaponCategoryRow = CombatInterfaceWeaponCategoryRow(DbHelper.row(row))

    public fun getRow(column: String): CombatInterfaceWeaponCategoryRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
