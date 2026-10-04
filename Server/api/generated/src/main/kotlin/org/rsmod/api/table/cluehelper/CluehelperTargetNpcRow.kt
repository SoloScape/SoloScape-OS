// AUTO-GENERATED for dbtable.cluehelper_target_npc — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.NpcServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.npc
import dev.openrune.types.dbcol.npcOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class CluehelperTargetNpcRow(
  row: DbHelper,
) {
  public val npc: NpcServerType = row.npc("dbcol.cluehelper_target_npc:npc")

  public val fallbackNpc: NpcServerType? =
      row.npcOptional("dbcol.cluehelper_target_npc:fallback_npc")

  public val coord: CoordGrid = row.coord("dbcol.cluehelper_target_npc:coord")

  public val description: String = row.string("dbcol.cluehelper_target_npc:description")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperTargetNpcRow> by
        lazy { DbHelper.table("dbtable.cluehelper_target_npc").map { CluehelperTargetNpcRow(it) } }

    public fun all(): List<CluehelperTargetNpcRow> = cachedAll

    public fun getRow(row: Int): CluehelperTargetNpcRow = CluehelperTargetNpcRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperTargetNpcRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
