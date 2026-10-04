// AUTO-GENERATED for dbtable.transmutation — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class TransmutationRow(
  row: DbHelper,
) {
  public val tierItem: List<Tuple2<ItemServerType, ItemServerType>> =
      row.multiColumnMixed("dbcol.transmutation:tier_item", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.ItemServerTypeCodec).toListOfTuple2()

  public val name: String = row.string("dbcol.transmutation:name")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<TransmutationRow> by
        lazy { DbHelper.table("dbtable.transmutation").map { TransmutationRow(it) } }

    public fun all(): List<TransmutationRow> = cachedAll

    public fun getRow(row: Int): TransmutationRow = TransmutationRow(DbHelper.row(row))

    public fun getRow(column: String): TransmutationRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
