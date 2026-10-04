// AUTO-GENERATED for dbtable.agility_obstacle — do not edit.
package org.rsmod.api.table.agility

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.SequenceServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.seq
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.agility.AgilityCourseRow

public class AgilityObstacleRow(
  row: DbHelper,
) {
  public val course: AgilityCourseRow by
      lazy { AgilityCourseRow.getRow(row.dbRow("dbcol.agility_obstacle:course").id) }

  public val ordinal: Int = row.int("dbcol.agility_obstacle:ordinal")

  public val locs: List<ObjectServerType> =
      row.list("dbcol.agility_obstacle:locs", DbColumnCodec.LocTypeCodec)

  public val landing: List<Int> =
      row.multiColumn("dbcol.agility_obstacle:landing", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val xp: Int = row.int("dbcol.agility_obstacle:xp")

  public val anim: SequenceServerType = row.seq("dbcol.agility_obstacle:anim")

  public val ticks: Int = row.int("dbcol.agility_obstacle:ticks")

  public val slide: Boolean = row.boolean("dbcol.agility_obstacle:slide")

  public val repeats: Int = row.int("dbcol.agility_obstacle:repeats")

  public val fail: List<Int> =
      row.slotsOptional("dbcol.agility_obstacle:fail", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<AgilityObstacleRow> by
        lazy { DbHelper.table("dbtable.agility_obstacle").map { AgilityObstacleRow(it) } }

    public fun all(): List<AgilityObstacleRow> = cachedAll

    public fun getRow(row: Int): AgilityObstacleRow = AgilityObstacleRow(DbHelper.row(row))

    public fun getRow(column: String): AgilityObstacleRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
