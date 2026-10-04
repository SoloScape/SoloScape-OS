// AUTO-GENERATED for dbtable.synth — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.SynthIdCodec
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.SynthRow
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class SynthRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.synth:name")

  public val subMenu: List<SynthRow> by
      lazy { row.slotsOptional("dbcol.synth:sub_menu", DbColumnCodec.DbRowTypeCodec).map { SynthRow.getRow(it.id) } }

  public val synth: List<Tuple2<String, Int>> =
      row.multiColumnMixedOptional("dbcol.synth:synth", DbColumnCodec.StringCodec, SynthIdCodec).toListOfTuple2()

  public val parentDirectory: SynthRow? by
      lazy { row.columnOptional("dbcol.synth:parent_directory", DbColumnCodec.DbRowTypeCodec)?.let { SynthRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SynthRow> by
        lazy { DbHelper.table("dbtable.synth").map { SynthRow(it) } }

    public fun all(): List<SynthRow> = cachedAll

    public fun getRow(row: Int): SynthRow = SynthRow(DbHelper.row(row))

    public fun getRow(column: String): SynthRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
