// AUTO-GENERATED for dbtable.fsw_info_normal_table — do not edit.
package org.rsmod.api.table.fsw

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.multiColumn
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class FswInfoNormalTableRow(
  row: DbHelper,
) {
  public val info: List<String> =
      row.multiColumn("dbcol.fsw_info_normal_table:info", DbColumnCodec.StringCodec, DbColumnCodec.StringCodec, DbColumnCodec.StringCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FswInfoNormalTableRow> by
        lazy { DbHelper.table("dbtable.fsw_info_normal_table").map { FswInfoNormalTableRow(it) } }

    public fun all(): List<FswInfoNormalTableRow> = cachedAll

    public fun getRow(row: Int): FswInfoNormalTableRow = FswInfoNormalTableRow(DbHelper.row(row))

    public fun getRow(column: String): FswInfoNormalTableRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
