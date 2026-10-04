// AUTO-GENERATED for dbtable.restrict_content_obj — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class RestrictContentObjRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<RestrictContentObjRow> by
        lazy { DbHelper.table("dbtable.restrict_content_obj").map { RestrictContentObjRow(it) } }

    public fun all(): List<RestrictContentObjRow> = cachedAll

    public fun getRow(row: Int): RestrictContentObjRow = RestrictContentObjRow(DbHelper.row(row))

    public fun getRow(column: String): RestrictContentObjRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
