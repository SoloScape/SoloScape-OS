// AUTO-GENERATED for dbtable.music — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.aconverted.MidiType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.midi
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.MusicRow

public class MusicRow(
  row: DbHelper,
) {
  public val sortname: String = row.string("dbcol.music:sortname")

  public val displayname: String = row.string("dbcol.music:displayname")

  public val unlockhint: String = row.string("dbcol.music:unlockhint")

  public val duration: Int = row.int("dbcol.music:duration")

  public val midi: MidiType = row.midi("dbcol.music:midi")

  public val variable: List<Int> =
      row.slotsOptional("dbcol.music:variable", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val automaticUnlock: Boolean? = row.booleanOptional("dbcol.music:automatic_unlock")

  public val area: List<Int> = row.slotsOptional("dbcol.music:area", DbColumnCodec.IntCodec)

  public val areaDefault: Int? = row.intOptional("dbcol.music:area_default")

  public val hidden: Boolean? = row.booleanOptional("dbcol.music:hidden")

  public val holiday: Int? = row.intOptional("dbcol.music:holiday")

  public val secondaryTrack: MusicRow? by
      lazy { row.columnOptional("dbcol.music:secondary_track", DbColumnCodec.DbRowTypeCodec)?.let { MusicRow.getRow(it.id) } }

  public val parentTrack: MusicRow? by
      lazy { row.columnOptional("dbcol.music:parent_track", DbColumnCodec.DbRowTypeCodec)?.let { MusicRow.getRow(it.id) } }

  public val releaseType: Int? = row.intOptional("dbcol.music:release_type")

  public val restrictedContent: Int? = row.intOptional("dbcol.music:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<MusicRow> by
        lazy { DbHelper.table("dbtable.music").map { MusicRow(it) } }

    public fun all(): List<MusicRow> = cachedAll

    public fun getRow(row: Int): MusicRow = MusicRow(DbHelper.row(row))

    public fun getRow(column: String): MusicRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
