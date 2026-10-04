// AUTO-GENERATED for dbtable.music_area_group — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.list
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class MusicAreaGroupRow(
  row: DbHelper,
) {
  public val area: List<Int> = row.list("dbcol.music_area_group:area", DbColumnCodec.IntCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<MusicAreaGroupRow> by
        lazy { DbHelper.table("dbtable.music_area_group").map { MusicAreaGroupRow(it) } }

    public fun all(): List<MusicAreaGroupRow> = cachedAll

    public fun getRow(row: Int): MusicAreaGroupRow = MusicAreaGroupRow(DbHelper.row(row))

    public fun getRow(column: String): MusicAreaGroupRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
