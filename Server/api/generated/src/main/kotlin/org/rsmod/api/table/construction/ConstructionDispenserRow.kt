// AUTO-GENERATED for dbtable.construction_dispenser — do not edit.
package org.rsmod.api.table.construction

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class ConstructionDispenserRow(
  row: DbHelper,
) {
  public val loc: ObjectServerType = row.loc("dbcol.construction_dispenser:loc")

  public val take: List<ItemServerType> =
      row.slotsOptional("dbcol.construction_dispenser:take", DbColumnCodec.ItemServerTypeCodec)

  public val fill: List<ItemServerType> =
      row.slotsOptional("dbcol.construction_dispenser:fill", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.ItemServerTypeCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ConstructionDispenserRow> by
        lazy { DbHelper.table("dbtable.construction_dispenser").map { ConstructionDispenserRow(it) } }

    public fun all(): List<ConstructionDispenserRow> = cachedAll

    public fun getRow(row: Int): ConstructionDispenserRow = ConstructionDispenserRow(DbHelper.row(row))

    public fun getRow(column: String): ConstructionDispenserRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
