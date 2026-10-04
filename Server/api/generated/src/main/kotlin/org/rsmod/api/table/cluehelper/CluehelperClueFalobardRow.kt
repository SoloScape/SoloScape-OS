// AUTO-GENERATED for dbtable.cluehelper_clue_falobard — do not edit.
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
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.cluehelper.CluehelperRequirementObjRow
import org.rsmod.api.table.cluehelper.CluehelperTargetNpcRow

public class CluehelperClueFalobardRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_falobard:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_falobard:difficulty")

  public val clueText: String = row.string("dbcol.cluehelper_clue_falobard:clue_text")

  public val target: CluehelperTargetNpcRow by
      lazy { CluehelperTargetNpcRow.getRow(row.dbRow("dbcol.cluehelper_clue_falobard:target").id) }

  public val requirements: CluehelperRequirementObjRow by
      lazy { CluehelperRequirementObjRow.getRow(row.dbRow("dbcol.cluehelper_clue_falobard:requirements").id) }

  public val region: List<Int> =
      row.list("dbcol.cluehelper_clue_falobard:region", DbColumnCodec.IntCodec)

  public val allregions: Boolean? = row.booleanOptional("dbcol.cluehelper_clue_falobard:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_falobard:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueFalobardRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_falobard").map { CluehelperClueFalobardRow(it) } }

    public fun all(): List<CluehelperClueFalobardRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueFalobardRow = CluehelperClueFalobardRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueFalobardRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
