// AUTO-GENERATED for dbtable.construction_furniture_build — do not edit.
package org.rsmod.api.table.construction

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class ConstructionFurnitureBuildRow(
  row: DbHelper,
) {
  public val modelObj: ItemServerType = row.obj("dbcol.construction_furniture_build:model_obj")

  public val xp: Int = row.int("dbcol.construction_furniture_build:xp")

  public val locs: List<ObjectServerType> =
      row.list("dbcol.construction_furniture_build:locs", DbColumnCodec.LocTypeCodec)

  public val parts: List<ObjectServerType> =
      row.slotsOptional("dbcol.construction_furniture_build:parts", DbColumnCodec.LocTypeCodec, DbColumnCodec.LocTypeCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ConstructionFurnitureBuildRow> by
        lazy { DbHelper.table("dbtable.construction_furniture_build").map { ConstructionFurnitureBuildRow(it) } }

    public fun all(): List<ConstructionFurnitureBuildRow> = cachedAll

    public fun getRow(row: Int): ConstructionFurnitureBuildRow = ConstructionFurnitureBuildRow(DbHelper.row(row))

    public fun getRow(column: String): ConstructionFurnitureBuildRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
