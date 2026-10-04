// AUTO-GENERATED for dbtable.furniture — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class FurnitureRow(
  row: DbHelper,
) {
  public val modelObj: ItemServerType = row.obj("dbcol.furniture:model_obj")

  public val name: String = row.string("dbcol.furniture:name")

  public val materialCost: List<Tuple2<ItemServerType, Int>> =
      row.multiColumnMixed("dbcol.furniture:material_cost", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val levelRequirement: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.furniture:level_requirement", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val hiddenInBuildMenu: Int? = row.intOptional("dbcol.furniture:hidden_in_build_menu")

  public val upgradeSourceRelative: Int? =
      row.intOptional("dbcol.furniture:upgrade_source_relative")

  public val upgradeSourceAbsolute: Int? =
      row.intOptional("dbcol.furniture:upgrade_source_absolute")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FurnitureRow> by
        lazy { DbHelper.table("dbtable.furniture").map { FurnitureRow(it) } }

    public fun all(): List<FurnitureRow> = cachedAll

    public fun getRow(row: Int): FurnitureRow = FurnitureRow(DbHelper.row(row))

    public fun getRow(column: String): FurnitureRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
