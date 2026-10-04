// AUTO-GENERATED for dbtable.cluehelper_clue_music — do not edit.
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
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.MusicRow
import org.rsmod.api.table.cluehelper.CluehelperTargetNpcRow

public class CluehelperClueMusicRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.cluehelper_clue_music:id")

  public val difficulty: Int = row.int("dbcol.cluehelper_clue_music:difficulty")

  public val music: MusicRow by
      lazy { MusicRow.getRow(row.dbRow("dbcol.cluehelper_clue_music:music").id) }

  public val unlockText: String = row.string("dbcol.cluehelper_clue_music:unlock_text")

  public val target: CluehelperTargetNpcRow by
      lazy { CluehelperTargetNpcRow.getRow(row.dbRow("dbcol.cluehelper_clue_music:target").id) }

  public val requirements: DBRowType? =
      row.columnOptional("dbcol.cluehelper_clue_music:requirements", DbColumnCodec.DbRowTypeCodec)

  public val region: Int? = row.intOptional("dbcol.cluehelper_clue_music:region")

  public val allregions: Boolean? = row.booleanOptional("dbcol.cluehelper_clue_music:allregions")

  public val restrictedContent: Int? =
      row.intOptional("dbcol.cluehelper_clue_music:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperClueMusicRow> by
        lazy { DbHelper.table("dbtable.cluehelper_clue_music").map { CluehelperClueMusicRow(it) } }

    public fun all(): List<CluehelperClueMusicRow> = cachedAll

    public fun getRow(row: Int): CluehelperClueMusicRow = CluehelperClueMusicRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperClueMusicRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
