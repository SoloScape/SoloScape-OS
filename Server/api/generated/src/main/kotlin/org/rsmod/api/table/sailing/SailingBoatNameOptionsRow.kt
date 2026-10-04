// AUTO-GENERATED for dbtable.sailing_boat_name_options — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingBoatNameOptionsRow(
  row: DbHelper,
) {
  public val default: String = row.string("dbcol.sailing_boat_name_options:default")

  public val option: List<String> =
      row.slotsOptional("dbcol.sailing_boat_name_options:option", DbColumnCodec.StringCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatNameOptionsRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_name_options").map { SailingBoatNameOptionsRow(it) } }

    public fun all(): List<SailingBoatNameOptionsRow> = cachedAll

    public fun getRow(row: Int): SailingBoatNameOptionsRow = SailingBoatNameOptionsRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatNameOptionsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
