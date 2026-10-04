// AUTO-GENERATED for dbtable.dogs — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.NpcServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.npc
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.PuppyColoursRow

public class DogsRow(
  row: DbHelper,
) {
  public val breed: PuppyColoursRow by
      lazy { PuppyColoursRow.getRow(row.dbRow("dbcol.dogs:breed").id) }

  public val colour: String = row.string("dbcol.dogs:colour")

  public val puppyObj: ItemServerType = row.obj("dbcol.dogs:puppy_obj")

  public val puppyNpc: NpcServerType = row.npc("dbcol.dogs:puppy_npc")

  public val dogObj: ItemServerType = row.obj("dbcol.dogs:dog_obj")

  public val dogNpc: NpcServerType = row.npc("dbcol.dogs:dog_npc")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DogsRow> by
        lazy { DbHelper.table("dbtable.dogs").map { DogsRow(it) } }

    public fun all(): List<DogsRow> = cachedAll

    public fun getRow(row: Int): DogsRow = DogsRow(DbHelper.row(row))

    public fun getRow(column: String): DogsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
