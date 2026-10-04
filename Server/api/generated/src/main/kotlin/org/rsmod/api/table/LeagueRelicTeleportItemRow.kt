// AUTO-GENERATED for dbtable.league_relic_teleport_item — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.TeleportGenericRow

public class LeagueRelicTeleportItemRow(
  row: DbHelper,
) {
  public val title: String = row.string("dbcol.league_relic_teleport_item:title")

  public val item: ItemServerType = row.obj("dbcol.league_relic_teleport_item:item")

  public val location: List<TeleportGenericRow> by
      lazy { row.list("dbcol.league_relic_teleport_item:location", DbColumnCodec.DbRowTypeCodec).map { TeleportGenericRow.getRow(it.id) } }

  public val respectWildyRestrictions: Boolean? =
      row.booleanOptional("dbcol.league_relic_teleport_item:respect_wildy_restrictions")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<LeagueRelicTeleportItemRow> by
        lazy { DbHelper.table("dbtable.league_relic_teleport_item").map { LeagueRelicTeleportItemRow(it) } }

    public fun all(): List<LeagueRelicTeleportItemRow> = cachedAll

    public fun getRow(row: Int): LeagueRelicTeleportItemRow = LeagueRelicTeleportItemRow(DbHelper.row(row))

    public fun getRow(column: String): LeagueRelicTeleportItemRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
