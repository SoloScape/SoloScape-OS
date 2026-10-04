// AUTO-GENERATED for dbtable.talent_tree — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.TalentTreeRow

public class TalentTreeRow(
  row: DbHelper,
) {
  public val drawCoord: List<Int> =
      row.multiColumn("dbcol.talent_tree:draw_coord", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val linkedNodes: List<TalentTreeRow> by
      lazy { row.list("dbcol.talent_tree:linked_nodes", DbColumnCodec.DbRowTypeCodec).map { TalentTreeRow.getRow(it.id) } }

  public val name: String = row.string("dbcol.talent_tree:name")

  public val effect: List<Int> =
      row.multiColumn("dbcol.talent_tree:effect", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val nodeType: Int? = row.intOptional("dbcol.talent_tree:node_type")

  public val nodeSize: Int? = row.intOptional("dbcol.talent_tree:node_size")

  public val nodeSprite: Int = row.column("dbcol.talent_tree:node_sprite", GraphicIdCodec)

  public val debugName: String = row.string("dbcol.talent_tree:debug_name")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<TalentTreeRow> by
        lazy { DbHelper.table("dbtable.talent_tree").map { TalentTreeRow(it) } }

    public fun all(): List<TalentTreeRow> = cachedAll

    public fun getRow(row: Int): TalentTreeRow = TalentTreeRow(DbHelper.row(row))

    public fun getRow(column: String): TalentTreeRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
