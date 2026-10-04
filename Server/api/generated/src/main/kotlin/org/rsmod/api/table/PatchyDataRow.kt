// AUTO-GENERATED for dbtable.patchy_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class PatchyDataRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.patchy_data:id")

  public val combined: ItemServerType = row.obj("dbcol.patchy_data:combined")

  public val ingredients: List<ItemServerType> =
      row.multiColumn("dbcol.patchy_data:ingredients", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.ItemServerTypeCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PatchyDataRow> by
        lazy { DbHelper.table("dbtable.patchy_data").map { PatchyDataRow(it) } }

    public fun all(): List<PatchyDataRow> = cachedAll

    public fun getRow(row: Int): PatchyDataRow = PatchyDataRow(DbHelper.row(row))

    public fun getRow(column: String): PatchyDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
