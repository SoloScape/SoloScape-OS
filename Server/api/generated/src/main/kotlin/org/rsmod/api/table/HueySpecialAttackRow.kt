// AUTO-GENERATED for dbtable.huey_special_attack — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class HueySpecialAttackRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<HueySpecialAttackRow> by
        lazy { DbHelper.table("dbtable.huey_special_attack").map { HueySpecialAttackRow(it) } }

    public fun all(): List<HueySpecialAttackRow> = cachedAll

    public fun getRow(row: Int): HueySpecialAttackRow = HueySpecialAttackRow(DbHelper.row(row))

    public fun getRow(column: String): HueySpecialAttackRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
