// AUTO-GENERATED for dbtable.music_classic — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.DBRowType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.aconverted.AreaType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class MusicClassicRow(
  row: DbHelper,
) {
  public val area: AreaType? =
      row.columnOptional("dbcol.music_classic:area", DbColumnCodec.AreaTypeCodec)

  public val track: DBRowType? =
      row.columnOptional("dbcol.music_classic:track", DbColumnCodec.DbRowTypeCodec)

  public val autoScript: Boolean? = row.booleanOptional("dbcol.music_classic:auto_script")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<MusicClassicRow> by
        lazy { DbHelper.table("dbtable.music_classic").map { MusicClassicRow(it) } }

    public fun all(): List<MusicClassicRow> = cachedAll

    public fun getRow(row: Int): MusicClassicRow = MusicClassicRow(DbHelper.row(row))

    public fun getRow(column: String): MusicClassicRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
