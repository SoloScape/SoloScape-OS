// AUTO-GENERATED for dbtable.music_modern — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.MusicRow

public class MusicModernRow(
  row: DbHelper,
) {
  public val area: String = row.string("dbcol.music_modern:area")

  public val tracks: List<MusicRow> by
      lazy { row.list("dbcol.music_modern:tracks", DbColumnCodec.DbRowTypeCodec).map { MusicRow.getRow(it.id) } }

  public val autoScript: Boolean = row.boolean("dbcol.music_modern:auto_script")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<MusicModernRow> by
        lazy { DbHelper.table("dbtable.music_modern").map { MusicModernRow(it) } }

    public fun all(): List<MusicModernRow> = cachedAll

    public fun getRow(row: Int): MusicModernRow = MusicModernRow(DbHelper.row(row))

    public fun getRow(column: String): MusicModernRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
