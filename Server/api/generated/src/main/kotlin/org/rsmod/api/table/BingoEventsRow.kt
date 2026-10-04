// AUTO-GENERATED for dbtable.bingo_events — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.enumTypeId
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.stringOptional
import dev.openrune.types.enums.EnumTypeMap
import dev.openrune.types.enums.`enum`
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.BingoGridsRow
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.toListOfTuple3
import org.rsmod.api.table.toTuple3

public class BingoEventsRow(
  row: DbHelper,
) {
  public val grid: BingoGridsRow by
      lazy { BingoGridsRow.getRow(row.dbRow("dbcol.bingo_events:grid").id) }

  public val eventName: String? = row.stringOptional("dbcol.bingo_events:event_name")

  public val eventEnd: Int = row.int("dbcol.bingo_events:event_end")

  public val rewardLeagueRelics: EnumTypeMap<Int, Int> =
      enum(row.enumTypeId("dbcol.bingo_events:reward_league_relics"))

  public val eventMaingameReward: List<Tuple3<ItemServerType, Int, Int>> =
      row.multiColumnMixed("dbcol.bingo_events:event_maingame_reward", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<BingoEventsRow> by
        lazy { DbHelper.table("dbtable.bingo_events").map { BingoEventsRow(it) } }

    public fun all(): List<BingoEventsRow> = cachedAll

    public fun getRow(row: Int): BingoEventsRow = BingoEventsRow(DbHelper.row(row))

    public fun getRow(column: String): BingoEventsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
