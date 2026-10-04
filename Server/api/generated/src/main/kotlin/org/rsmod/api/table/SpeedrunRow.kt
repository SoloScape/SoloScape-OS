// AUTO-GENERATED for dbtable.speedrun — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.InvIdCodec
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.QuestRow
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toListOfTuple3
import org.rsmod.api.table.toTuple2
import org.rsmod.api.table.toTuple3

public class SpeedrunRow(
  row: DbHelper,
) {
  public val quest: QuestRow by lazy { QuestRow.getRow(row.dbRow("dbcol.speedrun:quest").id) }

  public val speedrunState: Int = row.int("dbcol.speedrun:speedrun_state")

  public val speedrunTrophyTimes: List<Int> =
      row.multiColumn("dbcol.speedrun:speedrun_trophy_times", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val speedrunItemUnlocks: List<Tuple3<Int, ItemServerType, Int>> =
      row.multiColumnMixed("dbcol.speedrun:speedrun_item_unlocks", InvIdCodec, DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val speedrunQuestUnlocks: List<QuestRow> by
      lazy { row.slotsOptional("dbcol.speedrun:speedrun_quest_unlocks", DbColumnCodec.DbRowTypeCodec).map { QuestRow.getRow(it.id) } }

  public val speedrunStatUnlocks: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.speedrun:speedrun_stat_unlocks", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val speedrunCombatStatsUnlock: Int? =
      row.intOptional("dbcol.speedrun:speedrun_combat_stats_unlock")

  public val speedrunPohLocation: Int? = row.intOptional("dbcol.speedrun:speedrun_poh_location")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SpeedrunRow> by
        lazy { DbHelper.table("dbtable.speedrun").map { SpeedrunRow(it) } }

    public fun all(): List<SpeedrunRow> = cachedAll

    public fun getRow(row: Int): SpeedrunRow = SpeedrunRow(DbHelper.row(row))

    public fun getRow(column: String): SpeedrunRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
