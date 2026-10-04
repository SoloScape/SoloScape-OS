// AUTO-GENERATED for dbtable.league_relic_effect_toggle_list — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.list
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.LeagueRelicEffectToggleRow

public class LeagueRelicEffectToggleListRow(
  row: DbHelper,
) {
  public val toggle: List<LeagueRelicEffectToggleRow> by
      lazy { row.list("dbcol.league_relic_effect_toggle_list:toggle", DbColumnCodec.DbRowTypeCodec).map { LeagueRelicEffectToggleRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<LeagueRelicEffectToggleListRow> by
        lazy { DbHelper.table("dbtable.league_relic_effect_toggle_list").map { LeagueRelicEffectToggleListRow(it) } }

    public fun all(): List<LeagueRelicEffectToggleListRow> = cachedAll

    public fun getRow(row: Int): LeagueRelicEffectToggleListRow = LeagueRelicEffectToggleListRow(DbHelper.row(row))

    public fun getRow(column: String): LeagueRelicEffectToggleListRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
