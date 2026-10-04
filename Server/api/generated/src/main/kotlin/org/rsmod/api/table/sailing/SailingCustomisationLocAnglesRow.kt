// AUTO-GENERATED for dbtable.sailing_customisation_loc_angles — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumn
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingCustomisationLocAnglesRow(
  row: DbHelper,
) {
  public val angles: List<Int> =
      row.multiColumn("dbcol.sailing_customisation_loc_angles:angles", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val anglesLargeModifiers: Int? =
      row.intOptional("dbcol.sailing_customisation_loc_angles:angles_large_modifiers")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingCustomisationLocAnglesRow> by
        lazy { DbHelper.table("dbtable.sailing_customisation_loc_angles").map { SailingCustomisationLocAnglesRow(it) } }

    public fun all(): List<SailingCustomisationLocAnglesRow> = cachedAll

    public fun getRow(row: Int): SailingCustomisationLocAnglesRow = SailingCustomisationLocAnglesRow(DbHelper.row(row))

    public fun getRow(column: String): SailingCustomisationLocAnglesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
