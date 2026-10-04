// AUTO-GENERATED for dbtable.cluehelper_combat_encounter — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.NpcServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CluehelperCombatEncounterRow(
  row: DbHelper,
) {
  public val description: String = row.string("dbcol.cluehelper_combat_encounter:description")

  public val npcs: List<NpcServerType> =
      row.list("dbcol.cluehelper_combat_encounter:npcs", DbColumnCodec.NpcTypeCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperCombatEncounterRow> by
        lazy { DbHelper.table("dbtable.cluehelper_combat_encounter").map { CluehelperCombatEncounterRow(it) } }

    public fun all(): List<CluehelperCombatEncounterRow> = cachedAll

    public fun getRow(row: Int): CluehelperCombatEncounterRow = CluehelperCombatEncounterRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperCombatEncounterRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
