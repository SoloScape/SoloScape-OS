// AUTO-GENERATED for dbtable.boat_facilities_default_sprite_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.intOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class BoatFacilitiesDefaultSpriteDataRow(
  row: DbHelper,
) {
  public val facilitySubtype: Int? =
      row.intOptional("dbcol.boat_facilities_default_sprite_data:facility_subtype")

  public val sprite: Int =
      row.column("dbcol.boat_facilities_default_sprite_data:sprite", GraphicIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<BoatFacilitiesDefaultSpriteDataRow> by
        lazy { DbHelper.table("dbtable.boat_facilities_default_sprite_data").map { BoatFacilitiesDefaultSpriteDataRow(it) } }

    public fun all(): List<BoatFacilitiesDefaultSpriteDataRow> = cachedAll

    public fun getRow(row: Int): BoatFacilitiesDefaultSpriteDataRow = BoatFacilitiesDefaultSpriteDataRow(DbHelper.row(row))

    public fun getRow(column: String): BoatFacilitiesDefaultSpriteDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
