// AUTO-GENERATED for dbtable.pet_drops — do not edit.
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

public class PetDropsRow(
  row: DbHelper,
) {
  public val npc: NpcServerType = row.npc("dbcol.pet_drops:npc")

  public val pet: ItemServerType = row.obj("dbcol.pet_drops:pet")

  public val rate: Int = row.int("dbcol.pet_drops:rate")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PetDropsRow> by
        lazy { DbHelper.table("dbtable.pet_drops").map { PetDropsRow(it) } }

    public fun all(): List<PetDropsRow> = cachedAll

    public fun getRow(row: Int): PetDropsRow = PetDropsRow(DbHelper.row(row))

    public fun getRow(column: String): PetDropsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
