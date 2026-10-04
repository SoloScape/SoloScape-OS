// AUTO-GENERATED for dbtable.agility_course — do not edit.
package org.rsmod.api.table.agility

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class AgilityCourseRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.agility_course:name")

  public val level: Int = row.int("dbcol.agility_course:level")

  public val lapXp: Int = row.int("dbcol.agility_course:lap_xp")

  public val markOdds: List<Int> =
      row.multiColumn("dbcol.agility_course:mark_odds", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val markPenalty: Boolean = row.boolean("dbcol.agility_course:mark_penalty")

  public val petBase: Int = row.int("dbcol.agility_course:pet_base")

  public val markSpawns: List<CoordGrid> =
      row.slotsOptional("dbcol.agility_course:mark_spawns", DbColumnCodec.CoordGridCodec)

  public val quest: String? = row.stringOptional("dbcol.agility_course:quest")

  public val worn: List<ItemServerType> =
      row.slotsOptional("dbcol.agility_course:worn", DbColumnCodec.ItemServerTypeCodec)

  public val wornMessage: String? = row.stringOptional("dbcol.agility_course:worn_message")

  public val grapple: Boolean = row.boolean("dbcol.agility_course:grapple")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<AgilityCourseRow> by
        lazy { DbHelper.table("dbtable.agility_course").map { AgilityCourseRow(it) } }

    public fun all(): List<AgilityCourseRow> = cachedAll

    public fun getRow(row: Int): AgilityCourseRow = AgilityCourseRow(DbHelper.row(row))

    public fun getRow(column: String): AgilityCourseRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
