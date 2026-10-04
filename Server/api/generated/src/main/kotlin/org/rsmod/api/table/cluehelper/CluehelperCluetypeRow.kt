// AUTO-GENERATED for dbtable.cluehelper_cluetype — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.cluehelper.CluehelperClueAnagramRow
import org.rsmod.api.table.cluehelper.CluehelperClueHotcoldRow
import org.rsmod.api.table.cluehelper.CluehelperClueMapRow

public class CluehelperCluetypeRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.cluehelper_cluetype:name")

  public val questClues: List<CluehelperClueMapRow> by
      lazy { row.list("dbcol.cluehelper_cluetype:quest_clues", DbColumnCodec.DbRowTypeCodec).map { CluehelperClueMapRow.getRow(it.id) } }

  public val beginnerClues: List<CluehelperClueAnagramRow> by
      lazy { row.list("dbcol.cluehelper_cluetype:beginner_clues", DbColumnCodec.DbRowTypeCodec).map { CluehelperClueAnagramRow.getRow(it.id) } }

  public val easyClues: List<CluehelperClueMapRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_cluetype:easy_clues", DbColumnCodec.DbRowTypeCodec).map { CluehelperClueMapRow.getRow(it.id) } }

  public val mediumClues: List<CluehelperClueAnagramRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_cluetype:medium_clues", DbColumnCodec.DbRowTypeCodec).map { CluehelperClueAnagramRow.getRow(it.id) } }

  public val hardClues: List<CluehelperClueAnagramRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_cluetype:hard_clues", DbColumnCodec.DbRowTypeCodec).map { CluehelperClueAnagramRow.getRow(it.id) } }

  public val eliteClues: List<CluehelperClueAnagramRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_cluetype:elite_clues", DbColumnCodec.DbRowTypeCodec).map { CluehelperClueAnagramRow.getRow(it.id) } }

  public val masterClues: List<CluehelperClueHotcoldRow> by
      lazy { row.slotsOptional("dbcol.cluehelper_cluetype:master_clues", DbColumnCodec.DbRowTypeCodec).map { CluehelperClueHotcoldRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperCluetypeRow> by
        lazy { DbHelper.table("dbtable.cluehelper_cluetype").map { CluehelperCluetypeRow(it) } }

    public fun all(): List<CluehelperCluetypeRow> = cachedAll

    public fun getRow(row: Int): CluehelperCluetypeRow = CluehelperCluetypeRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperCluetypeRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
