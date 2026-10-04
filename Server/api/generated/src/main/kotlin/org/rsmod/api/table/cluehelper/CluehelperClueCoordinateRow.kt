// AUTO-GENERATED for dbtable.cluehelper_clue_coordinate — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.cluehelper.CluehelperCombatEncounterRow
import org.rsmod.api.table.cluehelper.CluehelperRequirementObjRow
import org.rsmod.api.table.cluehelper.CluehelperTargetCoordRow

public class CluehelperClueCoordinateRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_coordinate:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_coordinate:difficulty")

  public val clueText: String = row.string("dbcol.cluehelper_clue_coordinate:clue_text")

  public val target: CluehelperTargetCoordRow by
      lazy { CluehelperTargetCoordRow.getRow(row.dbRow("dbcol.cluehelper_clue_coordinate:target").id) }

  public val requirements: List<CluehelperRequirementObjRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_clue_coordinate:requirements", DbColumnCodec.DbRowTypeCodec).map { CluehelperRequirementObjRow.getRow(it.id) } }

  public val combatEncounter: List<CluehelperCombatEncounterRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_clue_coordinate:combat_encounter", DbColumnCodec.DbRowTypeCodec).map { CluehelperCombatEncounterRow.getRow(it.id) } }

  public val region: List<Int> =
      row.list("dbcol.cluehelper_clue_coordinate:region", DbColumnCodec.IntCodec)

  public val allregions: Boolean? =
      row.booleanOptional("dbcol.cluehelper_clue_coordinate:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_coordinate:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueCoordinateRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_coordinate").map { CluehelperClueCoordinateRow(it) } }

    public fun all(): List<CluehelperClueCoordinateRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueCoordinateRow = CluehelperClueCoordinateRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueCoordinateRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
