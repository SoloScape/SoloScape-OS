// AUTO-GENERATED for dbtable.cluehelper_target_kill — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.NpcServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class CluehelperTargetKillRow(
  row: DbHelper,
) {
  public val npcs: List<NpcServerType> =
      row.list("dbcol.cluehelper_target_kill:npcs", DbColumnCodec.NpcTypeCodec)

  public val coord: CoordGrid? =
      row.columnOptional("dbcol.cluehelper_target_kill:coord", DbColumnCodec.CoordGridCodec)

  public val description: String = row.string("dbcol.cluehelper_target_kill:description")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperTargetKillRow> by
        lazy { DbHelper.table("dbtable.cluehelper_target_kill").map { CluehelperTargetKillRow(it) } }

    public fun all(): List<CluehelperTargetKillRow> = cachedAll

    public fun getRow(row: Int): CluehelperTargetKillRow = CluehelperTargetKillRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperTargetKillRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
