// AUTO-GENERATED for dbtable.cluehelper_clue_map — do not edit.
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
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.cluehelper.CluehelperRequirementObjRow
import org.rsmod.api.table.cluehelper.CluehelperTargetCoordRow

public class CluehelperClueMapRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_map:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_map:difficulty")

  public val target: CluehelperTargetCoordRow by
      lazy { CluehelperTargetCoordRow.getRow(row.dbRow("dbcol.cluehelper_clue_map:target").id) }

  public val requirements: List<CluehelperRequirementObjRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_clue_map:requirements", DbColumnCodec.DbRowTypeCodec).map { CluehelperRequirementObjRow.getRow(it.id) } }

  public val region: Int = row.int("dbcol.cluehelper_clue_map:region")

  public val allregions: Boolean? = row.booleanOptional("dbcol.cluehelper_clue_map:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_map:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueMapRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_map").map { CluehelperClueMapRow(it) } }

    public fun all(): List<CluehelperClueMapRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueMapRow = CluehelperClueMapRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueMapRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
