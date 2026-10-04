// AUTO-GENERATED for dbtable.league_relic_clue_direct_teleport_item — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class LeagueRelicClueDirectTeleportItemRow(
  row: DbHelper,
) {
  public val item: ItemServerType = row.obj("dbcol.league_relic_clue_direct_teleport_item:item")

  public val nullClueText: String =
      row.string("dbcol.league_relic_clue_direct_teleport_item:null_clue_text")

  public val nullClueCoordText: String =
      row.string("dbcol.league_relic_clue_direct_teleport_item:null_clue_coord_text")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<LeagueRelicClueDirectTeleportItemRow> by
        lazy { DbHelper.table("dbtable.league_relic_clue_direct_teleport_item").map { LeagueRelicClueDirectTeleportItemRow(it) } }

    public fun all(): List<LeagueRelicClueDirectTeleportItemRow> = cachedAll

    public fun getRow(row: Int): LeagueRelicClueDirectTeleportItemRow = LeagueRelicClueDirectTeleportItemRow(DbHelper.row(row))

    public fun getRow(column: String): LeagueRelicClueDirectTeleportItemRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
