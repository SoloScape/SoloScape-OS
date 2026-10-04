// AUTO-GENERATED for dbtable.pickable_objects — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class PickableObjectsRow(
  row: DbHelper,
) {
  public val objects: List<ObjectServerType> =
      row.list("dbcol.pickable_objects:objects", DbColumnCodec.LocTypeCodec)

  public val itemgiven: ItemServerType = row.obj("dbcol.pickable_objects:itemgiven")

  public val itemamount: Int = row.int("dbcol.pickable_objects:itemamount")

  public val despawnchance: List<Int> =
      row.slotsOptional("dbcol.pickable_objects:despawnchance", DbColumnCodec.IntCodec)

  public val respawntime: Int = row.int("dbcol.pickable_objects:respawntime")

  public val messages: Int? = row.intOptional("dbcol.pickable_objects:messages")

  public val seed: ItemServerType? = row.objOptional("dbcol.pickable_objects:seed")

  public val objectcycle: Boolean = row.boolean("dbcol.pickable_objects:objectcycle")

  public val replacementloc: ObjectServerType? =
      row.columnOptional("dbcol.pickable_objects:replacementloc", DbColumnCodec.LocTypeCodec)

  public val forceswalk: Boolean = row.boolean("dbcol.pickable_objects:forceswalk")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PickableObjectsRow> by
        lazy { DbHelper.table("dbtable.pickable_objects").map { PickableObjectsRow(it) } }

    public fun all(): List<PickableObjectsRow> = cachedAll

    public fun getRow(row: Int): PickableObjectsRow = PickableObjectsRow(DbHelper.row(row))

    public fun getRow(column: String): PickableObjectsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
