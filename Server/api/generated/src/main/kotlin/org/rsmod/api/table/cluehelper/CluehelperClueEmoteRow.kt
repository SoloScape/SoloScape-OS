// AUTO-GENERATED for dbtable.cluehelper_clue_emote — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.dbRow
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
import org.rsmod.api.table.cluehelper.CluehelperCombatEncounterRow
import org.rsmod.api.table.cluehelper.CluehelperOutfitRow
import org.rsmod.api.table.cluehelper.CluehelperRequirementObjRow
import org.rsmod.api.table.cluehelper.CluehelperTargetCoordRow
import org.rsmod.map.CoordGrid

public class CluehelperClueEmoteRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_emote:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_emote:difficulty")

  public val clueText: String = row.string("dbcol.cluehelper_clue_emote:clue_text")

  public val target: CluehelperTargetCoordRow by
      lazy { CluehelperTargetCoordRow.getRow(row.dbRow("dbcol.cluehelper_clue_emote:target").id) }

  public val emote: List<Int> =
      row.list("dbcol.cluehelper_clue_emote:emote", DbColumnCodec.IntCodec)

  public val outfitTextFallback: String? =
      row.stringOptional("dbcol.cluehelper_clue_emote:outfit_text_fallback")

  public val outfit: List<CluehelperOutfitRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_clue_emote:outfit", DbColumnCodec.DbRowTypeCodec).map { CluehelperOutfitRow.getRow(it.id) } }

  public val hideyHoleLoc: ObjectServerType? =
      row.columnOptional("dbcol.cluehelper_clue_emote:hidey_hole_loc", DbColumnCodec.LocTypeCodec)

  public val hideyHoleCoord: CoordGrid? =
      row.columnOptional("dbcol.cluehelper_clue_emote:hidey_hole_coord", DbColumnCodec.CoordGridCodec)

  public val combatEncounter: CluehelperCombatEncounterRow? by
      lazy { row.columnOptional("dbcol.cluehelper_clue_emote:combat_encounter", DbColumnCodec.DbRowTypeCodec)?.let { CluehelperCombatEncounterRow.getRow(it.id) } }

  public val requirements: CluehelperRequirementObjRow? by
      lazy { row.columnOptional("dbcol.cluehelper_clue_emote:requirements", DbColumnCodec.DbRowTypeCodec)?.let { CluehelperRequirementObjRow.getRow(it.id) } }

  public val region: List<Int> =
      row.list("dbcol.cluehelper_clue_emote:region", DbColumnCodec.IntCodec)

  public val allregions: Boolean? = row.booleanOptional("dbcol.cluehelper_clue_emote:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_emote:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueEmoteRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_emote").map { CluehelperClueEmoteRow(it) } }

    public fun all(): List<CluehelperClueEmoteRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueEmoteRow = CluehelperClueEmoteRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueEmoteRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
