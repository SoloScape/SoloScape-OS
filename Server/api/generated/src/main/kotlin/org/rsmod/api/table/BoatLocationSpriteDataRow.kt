// AUTO-GENERATED for dbtable.boat_location_sprite_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class BoatLocationSpriteDataRow(
  row: DbHelper,
) {
  public val location: Int = row.int("dbcol.boat_location_sprite_data:location")

  public val sprite: Int = row.column("dbcol.boat_location_sprite_data:sprite", GraphicIdCodec)

  public val name: String = row.string("dbcol.boat_location_sprite_data:name")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<BoatLocationSpriteDataRow> by
        lazy { DbHelper.table("dbtable.boat_location_sprite_data").map { BoatLocationSpriteDataRow(it) } }

    public fun all(): List<BoatLocationSpriteDataRow> = cachedAll

    public fun getRow(row: Int): BoatLocationSpriteDataRow = BoatLocationSpriteDataRow(DbHelper.row(row))

    public fun getRow(column: String): BoatLocationSpriteDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
