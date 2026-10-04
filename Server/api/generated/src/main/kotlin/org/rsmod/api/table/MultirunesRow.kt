// AUTO-GENERATED for dbtable.multirunes — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class MultirunesRow(
  row: DbHelper,
) {
  public val baseRune: ItemServerType = row.obj("dbcol.multirunes:base_rune")

  public val comboAndAlternativeRunes: List<Tuple2<ItemServerType, ItemServerType>> =
      row.multiColumnMixed("dbcol.multirunes:combo_and_alternative_runes", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.ItemServerTypeCodec).toListOfTuple2()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<MultirunesRow> by
        lazy { DbHelper.table("dbtable.multirunes").map { MultirunesRow(it) } }

    public fun all(): List<MultirunesRow> = cachedAll

    public fun getRow(row: Int): MultirunesRow = MultirunesRow(DbHelper.row(row))

    public fun getRow(column: String): MultirunesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
