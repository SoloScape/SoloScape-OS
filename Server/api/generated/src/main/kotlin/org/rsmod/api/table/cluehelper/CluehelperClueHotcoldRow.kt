// AUTO-GENERATED for dbtable.cluehelper_clue_hotcold — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.definition.type.DBRowType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.cluehelper.CluehelperCombatEncounterRow
import org.rsmod.api.table.cluehelper.CluehelperTargetCoordRow

public class CluehelperClueHotcoldRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_hotcold:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_hotcold:difficulty")

  public val target: CluehelperTargetCoordRow by
      lazy { CluehelperTargetCoordRow.getRow(row.dbRow("dbcol.cluehelper_clue_hotcold:target").id) }

  public val requirements: DBRowType? =
      row.columnOptional("dbcol.cluehelper_clue_hotcold:requirements", DbColumnCodec.DbRowTypeCodec)

  public val combatEncounter: List<CluehelperCombatEncounterRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_clue_hotcold:combat_encounter", DbColumnCodec.DbRowTypeCodec).map { CluehelperCombatEncounterRow.getRow(it.id) } }

  public val region: List<Int> =
      row.list("dbcol.cluehelper_clue_hotcold:region", DbColumnCodec.IntCodec)

  public val allregions: Boolean? = row.booleanOptional("dbcol.cluehelper_clue_hotcold:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_hotcold:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueHotcoldRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_hotcold").map { CluehelperClueHotcoldRow(it) } }

    public fun all(): List<CluehelperClueHotcoldRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueHotcoldRow = CluehelperClueHotcoldRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueHotcoldRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
