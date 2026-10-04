// AUTO-GENERATED for dbtable.amenity — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class AmenityRow(
  row: DbHelper,
) {
  public val printName: String = row.string("dbcol.amenity:print_name")

  public val dummyobj: ItemServerType = row.obj("dbcol.amenity:dummyobj")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<AmenityRow> by
        lazy { DbHelper.table("dbtable.amenity").map { AmenityRow(it) } }

    public fun all(): List<AmenityRow> = cachedAll

    public fun getRow(row: Int): AmenityRow = AmenityRow(DbHelper.row(row))

    public fun getRow(column: String): AmenityRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
