// AUTO-GENERATED for dbtable.sailing_anchor_anims — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingAnchorAnimsRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingAnchorAnimsRow> by
        lazy { DbHelper.table("dbtable.sailing_anchor_anims").map { SailingAnchorAnimsRow(it) } }

    public fun all(): List<SailingAnchorAnimsRow> = cachedAll

    public fun getRow(row: Int): SailingAnchorAnimsRow = SailingAnchorAnimsRow(DbHelper.row(row))

    public fun getRow(column: String): SailingAnchorAnimsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
