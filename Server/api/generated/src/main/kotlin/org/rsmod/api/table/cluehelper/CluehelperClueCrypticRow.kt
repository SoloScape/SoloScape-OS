// AUTO-GENERATED for dbtable.cluehelper_clue_cryptic — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.cluehelper.CluehelperChallengeQuestionRow
import org.rsmod.api.table.cluehelper.CluehelperOutfitRow
import org.rsmod.api.table.cluehelper.CluehelperRequirementObjRow
import org.rsmod.api.table.cluehelper.CluehelperTargetNpcRow
import org.rsmod.map.CoordGrid

public class CluehelperClueCrypticRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_cryptic:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_cryptic:difficulty")

  public val clueText: String = row.string("dbcol.cluehelper_clue_cryptic:clue_text")

  public val target: List<CluehelperTargetNpcRow> by
      lazy { row.list("dbcol.cluehelper_clue_cryptic:target", DbColumnCodec.DbRowTypeCodec).map { CluehelperTargetNpcRow.getRow(it.id) } }

  public val requirements: List<CluehelperRequirementObjRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_clue_cryptic:requirements", DbColumnCodec.DbRowTypeCodec).map { CluehelperRequirementObjRow.getRow(it.id) } }

  public val challenge: CluehelperChallengeQuestionRow? by
      lazy { row.columnOptional("dbcol.cluehelper_clue_cryptic:challenge", DbColumnCodec.DbRowTypeCodec)?.let { CluehelperChallengeQuestionRow.getRow(it.id) } }

  public val outfitTextFallback: String? =
      row.stringOptional("dbcol.cluehelper_clue_cryptic:outfit_text_fallback")

  public val outfit: CluehelperOutfitRow? by
      lazy { row.columnOptional("dbcol.cluehelper_clue_cryptic:outfit", DbColumnCodec.DbRowTypeCodec)?.let { CluehelperOutfitRow.getRow(it.id) } }

  public val hideyHoleLoc: ObjectServerType? =
      row.columnOptional("dbcol.cluehelper_clue_cryptic:hidey_hole_loc", DbColumnCodec.LocTypeCodec)

  public val hideyHoleCoord: CoordGrid? =
      row.columnOptional("dbcol.cluehelper_clue_cryptic:hidey_hole_coord", DbColumnCodec.CoordGridCodec)

  public val region: List<Int> =
      row.list("dbcol.cluehelper_clue_cryptic:region", DbColumnCodec.IntCodec)

  public val allregions: Boolean? = row.booleanOptional("dbcol.cluehelper_clue_cryptic:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_cryptic:restricted_content")

  public val leagueClueText: String? =
      row.stringOptional("dbcol.cluehelper_clue_cryptic:league_clue_text")

  public val leagueTarget: CluehelperTargetNpcRow? by
      lazy { row.columnOptional("dbcol.cluehelper_clue_cryptic:league_target", DbColumnCodec.DbRowTypeCodec)?.let { CluehelperTargetNpcRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueCrypticRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_cryptic").map { CluehelperClueCrypticRow(it) } }

    public fun all(): List<CluehelperClueCrypticRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueCrypticRow = CluehelperClueCrypticRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueCrypticRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
