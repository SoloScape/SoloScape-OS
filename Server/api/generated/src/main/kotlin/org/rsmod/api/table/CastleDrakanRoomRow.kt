// AUTO-GENERATED for dbtable.castle_drakan_room — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixed
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple4
import org.rsmod.api.table.toListOfTuple4
import org.rsmod.api.table.toTuple4

public class CastleDrakanRoomRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.castle_drakan_room:id")

  public val mapDetails: List<Tuple4<Int, Int, Int, Int>> =
      row.multiColumnMixed("dbcol.castle_drakan_room:map_details", DbColumnCodec.IntCodec, GraphicIdCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple4()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CastleDrakanRoomRow> by
        lazy { DbHelper.table("dbtable.castle_drakan_room").map { CastleDrakanRoomRow(it) } }

    public fun all(): List<CastleDrakanRoomRow> = cachedAll

    public fun getRow(row: Int): CastleDrakanRoomRow = CastleDrakanRoomRow(DbHelper.row(row))

    public fun getRow(column: String): CastleDrakanRoomRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
