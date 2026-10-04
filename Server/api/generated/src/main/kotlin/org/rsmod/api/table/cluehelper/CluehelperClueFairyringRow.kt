// AUTO-GENERATED for dbtable.cluehelper_clue_fairyring — do not edit.
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
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.cluehelper.CluehelperTargetCoordRow

public class CluehelperClueFairyringRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_fairyring:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_fairyring:difficulty")

  public val clueText: String = row.string("dbcol.cluehelper_clue_fairyring:clue_text")

  public val fairyring: Int = row.int("dbcol.cluehelper_clue_fairyring:fairyring")

  public val steps: List<Int> =
      row.multiColumn("dbcol.cluehelper_clue_fairyring:steps", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val target: CluehelperTargetCoordRow by
      lazy { CluehelperTargetCoordRow.getRow(row.dbRow("dbcol.cluehelper_clue_fairyring:target").id) }

  public val requirements: DBRowType? =
      row.columnOptional("dbcol.cluehelper_clue_fairyring:requirements", DbColumnCodec.DbRowTypeCodec)

  public val region: List<Int> =
      row.list("dbcol.cluehelper_clue_fairyring:region", DbColumnCodec.IntCodec)

  public val allregions: Boolean? =
      row.booleanOptional("dbcol.cluehelper_clue_fairyring:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_fairyring:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueFairyringRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_fairyring").map { CluehelperClueFairyringRow(it) } }

    public fun all(): List<CluehelperClueFairyringRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueFairyringRow = CluehelperClueFairyringRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueFairyringRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
