// AUTO-GENERATED for dbtable.pets — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.NpcServerType
import dev.openrune.types.SequenceServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.npc
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class PetsRow(
  row: DbHelper,
) {
  public val pet: String = row.string("dbcol.pets:pet")

  public val name: String = row.string("dbcol.pets:name")

  public val category: Int = row.int("dbcol.pets:category")

  public val obj: ItemServerType = row.obj("dbcol.pets:obj")

  public val npc: NpcServerType = row.npc("dbcol.pets:npc")

  public val base: Boolean = row.boolean("dbcol.pets:base")

  public val runs: Boolean = row.boolean("dbcol.pets:runs")

  public val mainDrop: Boolean = row.boolean("dbcol.pets:main_drop")

  public val unlock: Int? = row.intOptional("dbcol.pets:unlock")

  public val itemUse: Boolean = row.boolean("dbcol.pets:item_use")

  public val emotes: List<SequenceServerType> =
      row.slotsOptional("dbcol.pets:emotes", DbColumnCodec.SeqCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PetsRow> by
        lazy { DbHelper.table("dbtable.pets").map { PetsRow(it) } }

    public fun all(): List<PetsRow> = cachedAll

    public fun getRow(row: Int): PetsRow = PetsRow(DbHelper.row(row))

    public fun getRow(column: String): PetsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
