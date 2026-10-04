// AUTO-GENERATED for dbtable.sailing_crew — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.NpcServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.npc
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingCrewRow(
  row: DbHelper,
) {
  public val uniqueId: Int = row.int("dbcol.sailing_crew:unique_id")

  public val boatNpc: NpcServerType = row.npc("dbcol.sailing_crew:boat_npc")

  public val cargoNpc: List<NpcServerType> =
      row.list("dbcol.sailing_crew:cargo_npc", DbColumnCodec.NpcTypeCodec)

  public val sprite: Int = row.column("dbcol.sailing_crew:sprite", GraphicIdCodec)

  public val statHelmsmanship: Int = row.int("dbcol.sailing_crew:stat_helmsmanship")

  public val statPrivateering: Int = row.int("dbcol.sailing_crew:stat_privateering")

  public val statDeckhandiness: Int = row.int("dbcol.sailing_crew:stat_deckhandiness")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingCrewRow> by
        lazy { DbHelper.table("dbtable.sailing_crew").map { SailingCrewRow(it) } }

    public fun all(): List<SailingCrewRow> = cachedAll

    public fun getRow(row: Int): SailingCrewRow = SailingCrewRow(DbHelper.row(row))

    public fun getRow(column: String): SailingCrewRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
