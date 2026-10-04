// AUTO-GENERATED for dbtable.league_relic_effect_toggle — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.StructIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class LeagueRelicEffectToggleRow(
  row: DbHelper,
) {
  public val toggleDebugname: String =
      row.string("dbcol.league_relic_effect_toggle:toggle_debugname")

  public val toggleRelic: Int =
      row.column("dbcol.league_relic_effect_toggle:toggle_relic", StructIdCodec)

  public val toggleDesc: String = row.string("dbcol.league_relic_effect_toggle:toggle_desc")

  public val toggleOnMessage: String =
      row.string("dbcol.league_relic_effect_toggle:toggle_on_message")

  public val toggleOffMessage: String =
      row.string("dbcol.league_relic_effect_toggle:toggle_off_message")

  public val toggleInvert: Boolean? =
      row.booleanOptional("dbcol.league_relic_effect_toggle:toggle_invert")

  public val toggleBit: Int = row.int("dbcol.league_relic_effect_toggle:toggle_bit")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<LeagueRelicEffectToggleRow> by
        lazy { DbHelper.table("dbtable.league_relic_effect_toggle").map { LeagueRelicEffectToggleRow(it) } }

    public fun all(): List<LeagueRelicEffectToggleRow> = cachedAll

    public fun getRow(row: Int): LeagueRelicEffectToggleRow = LeagueRelicEffectToggleRow(DbHelper.row(row))

    public fun getRow(column: String): LeagueRelicEffectToggleRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
