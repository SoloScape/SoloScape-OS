// AUTO-GENERATED for dbtable.agility_stage — do not edit.
package org.rsmod.api.table.agility

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.SequenceServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.seq
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.agility.AgilityObstacleRow

public class AgilityStageRow(
  row: DbHelper,
) {
  public val obstacle: AgilityObstacleRow by
      lazy { AgilityObstacleRow.getRow(row.dbRow("dbcol.agility_stage:obstacle").id) }

  public val ordinal: Int = row.int("dbcol.agility_stage:ordinal")

  public val anim: SequenceServerType = row.seq("dbcol.agility_stage:anim")

  public val landing: List<Int> =
      row.slotsOptional("dbcol.agility_stage:landing", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val ticks: Int = row.int("dbcol.agility_stage:ticks")

  public val slide: Boolean = row.boolean("dbcol.agility_stage:slide")

  public val moveTicks: Int = row.int("dbcol.agility_stage:move_ticks")

  public val perTile: Int = row.int("dbcol.agility_stage:per_tile")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<AgilityStageRow> by
        lazy { DbHelper.table("dbtable.agility_stage").map { AgilityStageRow(it) } }

    public fun all(): List<AgilityStageRow> = cachedAll

    public fun getRow(row: Int): AgilityStageRow = AgilityStageRow(DbHelper.row(row))

    public fun getRow(column: String): AgilityStageRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
