// AUTO-GENERATED for dbtable.jigsaw — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.Tuple4
import org.rsmod.api.table.toListOfTuple3
import org.rsmod.api.table.toListOfTuple4
import org.rsmod.api.table.toTuple3
import org.rsmod.api.table.toTuple4

public class JigsawRow(
  row: DbHelper,
) {
  public val piece: List<Tuple3<Int, Int, Int>> =
      row.multiColumnMixed("dbcol.jigsaw:piece", ModelIdCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val pieceStartPosition: List<Int> =
      row.multiColumn("dbcol.jigsaw:piece_start_position", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val backing: Int = row.column("dbcol.jigsaw:backing", ModelIdCodec)

  public val pieceName: String = row.string("dbcol.jigsaw:piece_name")

  public val snapLeeway: Int = row.int("dbcol.jigsaw:snap_leeway")

  public val pieceZoom: Int? = row.intOptional("dbcol.jigsaw:piece_zoom")

  public val pieceSizeX: Int? = row.intOptional("dbcol.jigsaw:piece_size_x")

  public val pieceSizeY: Int? = row.intOptional("dbcol.jigsaw:piece_size_y")

  public val preview: List<Tuple4<Int, Int, Int, Int>> =
      row.multiColumnMixed("dbcol.jigsaw:preview", ModelIdCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple4()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<JigsawRow> by
        lazy { DbHelper.table("dbtable.jigsaw").map { JigsawRow(it) } }

    public fun all(): List<JigsawRow> = cachedAll

    public fun getRow(row: Int): JigsawRow = JigsawRow(DbHelper.row(row))

    public fun getRow(column: String): JigsawRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
