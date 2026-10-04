// AUTO-GENERATED for dbtable.poh_room — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.component
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.PohHotspotRow
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class PohRoomRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.poh_room:name")

  public val nameUppercase: String = row.string("dbcol.poh_room:name_uppercase")

  public val cost: Int = row.int("dbcol.poh_room:cost")

  public val roomType: Int = row.int("dbcol.poh_room:room_type")

  public val levelRequirement: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.poh_room:level_requirement", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val sourceOffset: List<Int> =
      row.multiColumn("dbcol.poh_room:source_offset", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val doorLocations: List<Int> =
      row.slotsOptional("dbcol.poh_room:door_locations", DbColumnCodec.IntCodec)

  public val hotspot: List<PohHotspotRow> by
      lazy { row.slotsOptional("dbcol.poh_room:hotspot", DbColumnCodec.DbRowTypeCodec).map { PohHotspotRow.getRow(it.id) } }

  public val floorRestriction: Int? = row.intOptional("dbcol.poh_room:floor_restriction")

  public val hasRoof: Int? = row.intOptional("dbcol.poh_room:has_roof")

  public val roomObj: ItemServerType = row.obj("dbcol.poh_room:room_obj")

  public val button: ComponentType = row.component("dbcol.poh_room:button")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PohRoomRow> by
        lazy { DbHelper.table("dbtable.poh_room").map { PohRoomRow(it) } }

    public fun all(): List<PohRoomRow> = cachedAll

    public fun getRow(row: Int): PohRoomRow = PohRoomRow(DbHelper.row(row))

    public fun getRow(column: String): PohRoomRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
