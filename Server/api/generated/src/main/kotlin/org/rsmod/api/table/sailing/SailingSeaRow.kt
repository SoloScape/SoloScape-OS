// AUTO-GENERATED for dbtable.sailing_sea — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.sailing.SailingSeaRow
import org.rsmod.map.CoordGrid

public class SailingSeaRow(
  row: DbHelper,
) {
  public val uniqueId: Int = row.int("dbcol.sailing_sea:unique_id")

  public val oceanId: Int? = row.intOptional("dbcol.sailing_sea:ocean_id")

  public val name: String = row.string("dbcol.sailing_sea:name")

  public val type: Int = row.int("dbcol.sailing_sea:type")

  public val ocean: SailingSeaRow? by
      lazy { row.columnOptional("dbcol.sailing_sea:ocean", DbColumnCodec.DbRowTypeCodec)?.let { SailingSeaRow.getRow(it.id) } }

  public val requiredLevel: Int = row.int("dbcol.sailing_sea:required_level")

  public val xpLevel: Int? = row.intOptional("dbcol.sailing_sea:xp_level")

  public val centreCoord: CoordGrid? =
      row.columnOptional("dbcol.sailing_sea:centre_coord", DbColumnCodec.CoordGridCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingSeaRow> by
        lazy { DbHelper.table("dbtable.sailing_sea").map { SailingSeaRow(it) } }

    public fun all(): List<SailingSeaRow> = cachedAll

    public fun getRow(row: Int): SailingSeaRow = SailingSeaRow(DbHelper.row(row))

    public fun getRow(column: String): SailingSeaRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
