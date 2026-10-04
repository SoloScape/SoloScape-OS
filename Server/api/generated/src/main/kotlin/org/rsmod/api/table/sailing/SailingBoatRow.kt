// AUTO-GENERATED for dbtable.sailing_boat — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.definition.type.DBRowType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.LocShapeIdCodec
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple4
import org.rsmod.api.table.sailing.SailingBoatBrazierRow
import org.rsmod.api.table.sailing.SailingBoatFlagRow
import org.rsmod.api.table.sailing.SailingBoatHullRow
import org.rsmod.api.table.sailing.SailingBoatKeelRow
import org.rsmod.api.table.sailing.SailingBoatSailPatternRow
import org.rsmod.api.table.sailing.SailingBoatSailRow
import org.rsmod.api.table.sailing.SailingBoatSteeringRow
import org.rsmod.api.table.sailing.SailingBoatTrimRow
import org.rsmod.api.table.toListOfTuple4
import org.rsmod.api.table.toTuple4
import org.rsmod.map.CoordGrid

public class SailingBoatRow(
  row: DbHelper,
) {
  public val typeId: Int = row.int("dbcol.sailing_boat:type_id")

  public val name: String = row.string("dbcol.sailing_boat:name")

  public val inlineName: String = row.string("dbcol.sailing_boat:inline_name")

  public val displayname: String? = row.stringOptional("dbcol.sailing_boat:displayname")

  public val levelRequired: Int = row.int("dbcol.sailing_boat:level_required")

  public val playerCapacity: Int = row.int("dbcol.sailing_boat:player_capacity")

  public val boatSize: Int = row.int("dbcol.sailing_boat:boat_size")

  public val sizeDesc: String = row.string("dbcol.sailing_boat:size_desc")

  public val combinedNavigation: Boolean = row.boolean("dbcol.sailing_boat:combined_navigation")

  public val retrievalCost: Int = row.int("dbcol.sailing_boat:retrieval_cost")

  public val keelOption: List<SailingBoatKeelRow> by
      lazy { row.slotsOptional("dbcol.sailing_boat:keel_option", DbColumnCodec.DbRowTypeCodec).map { SailingBoatKeelRow.getRow(it.id) } }

  public val hullOption: List<SailingBoatHullRow> by
      lazy { row.list("dbcol.sailing_boat:hull_option", DbColumnCodec.DbRowTypeCodec).map { SailingBoatHullRow.getRow(it.id) } }

  public val sailOption: List<SailingBoatSailRow> by
      lazy { row.list("dbcol.sailing_boat:sail_option", DbColumnCodec.DbRowTypeCodec).map { SailingBoatSailRow.getRow(it.id) } }

  public val sailPatternOption: List<SailingBoatSailPatternRow> by
      lazy { row.list("dbcol.sailing_boat:sail_pattern_option", DbColumnCodec.DbRowTypeCodec).map { SailingBoatSailPatternRow.getRow(it.id) } }

  public val steeringOption: List<SailingBoatSteeringRow> by
      lazy { row.list("dbcol.sailing_boat:steering_option", DbColumnCodec.DbRowTypeCodec).map { SailingBoatSteeringRow.getRow(it.id) } }

  public val flagOption: List<SailingBoatFlagRow> by
      lazy { row.slotsOptional("dbcol.sailing_boat:flag_option", DbColumnCodec.DbRowTypeCodec).map { SailingBoatFlagRow.getRow(it.id) } }

  public val trimOption: List<SailingBoatTrimRow> by
      lazy { row.slotsOptional("dbcol.sailing_boat:trim_option", DbColumnCodec.DbRowTypeCodec).map { SailingBoatTrimRow.getRow(it.id) } }

  public val brazierOption: SailingBoatBrazierRow? by
      lazy { row.columnOptional("dbcol.sailing_boat:brazier_option", DbColumnCodec.DbRowTypeCodec)?.let { SailingBoatBrazierRow.getRow(it.id) } }

  public val hotspot: List<Tuple4<CoordGrid, Int, Int, DBRowType>> =
      row.multiColumnMixedOptional("dbcol.sailing_boat:hotspot", DbColumnCodec.CoordGridCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.DbRowTypeCodec).toListOfTuple4()

  public val staticFacility: List<Tuple4<CoordGrid, ObjectServerType, Int, Int>> =
      row.multiColumnMixedOptional("dbcol.sailing_boat:static_facility", DbColumnCodec.CoordGridCodec, DbColumnCodec.LocTypeCodec, DbColumnCodec.IntCodec, LocShapeIdCodec).toListOfTuple4()

  public val facilityAmount: Int? = row.intOptional("dbcol.sailing_boat:facility_amount")

  public val sameFacilitiesPortAndStarboard: Boolean? =
      row.booleanOptional("dbcol.sailing_boat:same_facilities_port_and_starboard")

  public val crewCapacity: Int? = row.intOptional("dbcol.sailing_boat:crew_capacity")

  public val temporaryBoat: Boolean? = row.booleanOptional("dbcol.sailing_boat:temporary_boat")

  public val boatSprite: Int = row.column("dbcol.sailing_boat:boat_sprite", GraphicIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatRow> by
        lazy { DbHelper.table("dbtable.sailing_boat").map { SailingBoatRow(it) } }

    public fun all(): List<SailingBoatRow> = cachedAll

    public fun getRow(row: Int): SailingBoatRow = SailingBoatRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
