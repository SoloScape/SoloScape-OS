// AUTO-GENERATED for dbtable.ent_totems_site_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class EntTotemsSiteDataRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<EntTotemsSiteDataRow> by
        lazy { DbHelper.table("dbtable.ent_totems_site_data").map { EntTotemsSiteDataRow(it) } }

    public fun all(): List<EntTotemsSiteDataRow> = cachedAll

    public fun getRow(row: Int): EntTotemsSiteDataRow = EntTotemsSiteDataRow(DbHelper.row(row))

    public fun getRow(column: String): EntTotemsSiteDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
