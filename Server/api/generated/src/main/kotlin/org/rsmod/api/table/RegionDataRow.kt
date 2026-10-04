// AUTO-GENERATED for dbtable.region_data — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.StructIdCodec
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.enumTypeIdOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import dev.openrune.types.enums.EnumTypeMap
import dev.openrune.types.enums.`enum`
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class RegionDataRow(
  row: DbHelper,
) {
  public val regionId: Int = row.int("dbcol.region_data:region_id")

  public val name: String = row.string("dbcol.region_data:name")

  public val mapGraphic: Int? = row.columnOptional("dbcol.region_data:map_graphic", GraphicIdCodec)

  public val mapComponent: ComponentType? =
      row.columnOptional("dbcol.region_data:map_component", DbColumnCodec.ComponentTypeCodec)

  public val nameComponent: ComponentType? =
      row.columnOptional("dbcol.region_data:name_component", DbColumnCodec.ComponentTypeCodec)

  public val shieldComponent: ComponentType? =
      row.columnOptional("dbcol.region_data:shield_component", DbColumnCodec.ComponentTypeCodec)

  public val mapShieldSprite: Int? =
      row.columnOptional("dbcol.region_data:map_shield_sprite", GraphicIdCodec)

  public val mapShieldSpriteHighlighted: Int? =
      row.columnOptional("dbcol.region_data:map_shield_sprite_highlighted", GraphicIdCodec)

  public val mapShieldSpriteSmall: Int? =
      row.columnOptional("dbcol.region_data:map_shield_sprite_small", GraphicIdCodec)

  public val mapNameSprite: Int? =
      row.columnOptional("dbcol.region_data:map_name_sprite", GraphicIdCodec)

  public val mapNameSpriteHighlighted: Int? =
      row.columnOptional("dbcol.region_data:map_name_sprite_highlighted", GraphicIdCodec)

  public val mapSlideshow: EnumTypeMap<Int, Int>? =
      row.enumTypeIdOptional("dbcol.region_data:map_slideshow")?.let { enum(it) }

  public val areaInfo: Int? = row.columnOptional("dbcol.region_data:area_info", StructIdCodec)

  public val areaTeleportCoord: CoordGrid? =
      row.columnOptional("dbcol.region_data:area_teleport_coord", DbColumnCodec.CoordGridCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<RegionDataRow> by
        lazy { DbHelper.table("dbtable.region_data").map { RegionDataRow(it) } }

    public fun all(): List<RegionDataRow> = cachedAll

    public fun getRow(row: Int): RegionDataRow = RegionDataRow(DbHelper.row(row))

    public fun getRow(column: String): RegionDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
