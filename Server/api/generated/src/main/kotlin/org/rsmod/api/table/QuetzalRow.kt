// AUTO-GENERATED for dbtable.quetzal — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class QuetzalRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.quetzal:id")

  public val name: String = row.string("dbcol.quetzal:name")

  public val coord: CoordGrid = row.coord("dbcol.quetzal:coord")

  public val ifModel: Int = row.column("dbcol.quetzal:if_model", ModelIdCodec)

  public val ifXPos: Int = row.int("dbcol.quetzal:if_x_pos")

  public val ifYPos: Int = row.int("dbcol.quetzal:if_y_pos")

  public val autoUnlocked: Boolean = row.boolean("dbcol.quetzal:auto_unlocked")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<QuetzalRow> by
        lazy { DbHelper.table("dbtable.quetzal").map { QuetzalRow(it) } }

    public fun all(): List<QuetzalRow> = cachedAll

    public fun getRow(row: Int): QuetzalRow = QuetzalRow(DbHelper.row(row))

    public fun getRow(column: String): QuetzalRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
