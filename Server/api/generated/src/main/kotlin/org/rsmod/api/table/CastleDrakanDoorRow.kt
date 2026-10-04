// AUTO-GENERATED for dbtable.castle_drakan_door — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.objOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.CastleDrakanRoomRow

public class CastleDrakanDoorRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.castle_drakan_door:id")

  public val mapDetails: List<Int> =
      row.multiColumn("dbcol.castle_drakan_door:map_details", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val unlockSide: CastleDrakanRoomRow? by
      lazy { row.columnOptional("dbcol.castle_drakan_door:unlock_side", DbColumnCodec.DbRowTypeCodec)?.let { CastleDrakanRoomRow.getRow(it.id) } }

  public val key: ItemServerType? = row.objOptional("dbcol.castle_drakan_door:key")

  public val emblem: Int? = row.intOptional("dbcol.castle_drakan_door:emblem")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CastleDrakanDoorRow> by
        lazy { DbHelper.table("dbtable.castle_drakan_door").map { CastleDrakanDoorRow(it) } }

    public fun all(): List<CastleDrakanDoorRow> = cachedAll

    public fun getRow(row: Int): CastleDrakanDoorRow = CastleDrakanDoorRow(DbHelper.row(row))

    public fun getRow(column: String): CastleDrakanDoorRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
