// AUTO-GENERATED for dbtable.runecrafting_altars — do not edit.
package org.rsmod.api.table.runecrafting

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.ComboruneRecipeRow
import org.rsmod.api.table.runecrafting.RunecraftingRunesRow
import org.rsmod.api.table.runecrafting.RunecraftingTiaraRow
import org.rsmod.map.CoordGrid

public class RunecraftingAltarsRow(
  row: DbHelper,
) {
  public val altarObject: ObjectServerType = row.loc("dbcol.runecrafting_altars:altar_object")

  public val exitPortal: ObjectServerType? =
      row.columnOptional("dbcol.runecrafting_altars:exit_portal", DbColumnCodec.LocTypeCodec)

  public val talisman: ItemServerType? = row.objOptional("dbcol.runecrafting_altars:talisman")

  public val tiara: RunecraftingTiaraRow? by
      lazy { row.columnOptional("dbcol.runecrafting_altars:tiara", DbColumnCodec.DbRowTypeCodec)?.let { RunecraftingTiaraRow.getRow(it.id) } }

  public val varbit: Int? = row.intOptional("dbcol.runecrafting_altars:varbit")

  public val rune: RunecraftingRunesRow by
      lazy { RunecraftingRunesRow.getRow(row.dbRow("dbcol.runecrafting_altars:rune").id) }

  public val entrance: CoordGrid? =
      row.columnOptional("dbcol.runecrafting_altars:entrance", DbColumnCodec.CoordGridCodec)

  public val exit: CoordGrid? =
      row.columnOptional("dbcol.runecrafting_altars:exit", DbColumnCodec.CoordGridCodec)

  public val ruins: List<ObjectServerType> =
      row.slotsOptional("dbcol.runecrafting_altars:ruins", DbColumnCodec.LocTypeCodec)

  public val combo: List<ComboruneRecipeRow> by
      lazy { row.slotsOptional("dbcol.runecrafting_altars:combo", DbColumnCodec.DbRowTypeCodec).map { ComboruneRecipeRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<RunecraftingAltarsRow> by
        lazy { DbHelper.table("dbtable.runecrafting_altars").map { RunecraftingAltarsRow(it) } }

    public fun all(): List<RunecraftingAltarsRow> = cachedAll

    public fun getRow(row: Int): RunecraftingAltarsRow = RunecraftingAltarsRow(DbHelper.row(row))

    public fun getRow(column: String): RunecraftingAltarsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
