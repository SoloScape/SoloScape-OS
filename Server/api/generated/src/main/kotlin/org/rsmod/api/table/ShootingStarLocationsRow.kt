// AUTO-GENERATED for dbtable.shooting_star_locations — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class ShootingStarLocationsRow(
  row: DbHelper,
) {
  public val key: String = row.string("dbcol.shooting_star_locations:key")

  public val desc: String = row.string("dbcol.shooting_star_locations:desc")

  public val coords: CoordGrid = row.coord("dbcol.shooting_star_locations:coords")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ShootingStarLocationsRow> by
        lazy { DbHelper.table("dbtable.shooting_star_locations").map { ShootingStarLocationsRow(it) } }

    public fun all(): List<ShootingStarLocationsRow> = cachedAll

    public fun getRow(row: Int): ShootingStarLocationsRow = ShootingStarLocationsRow(DbHelper.row(row))

    public fun getRow(column: String): ShootingStarLocationsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
