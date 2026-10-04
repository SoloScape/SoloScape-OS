// AUTO-GENERATED for dbtable.cats — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.NpcServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.npc
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CatsRow(
  row: DbHelper,
) {
  public val stage: Int = row.int("dbcol.cats:stage")

  public val colour: Int = row.int("dbcol.cats:colour")

  public val obj: ItemServerType = row.obj("dbcol.cats:obj")

  public val npc: NpcServerType = row.npc("dbcol.cats:npc")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CatsRow> by
        lazy { DbHelper.table("dbtable.cats").map { CatsRow(it) } }

    public fun all(): List<CatsRow> = cachedAll

    public fun getRow(row: Int): CatsRow = CatsRow(DbHelper.row(row))

    public fun getRow(column: String): CatsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
