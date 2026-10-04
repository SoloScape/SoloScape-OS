// AUTO-GENERATED for dbtable.vmq4_metzli_boss_special_teleport — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Vmq4MetzliBossSpecialTeleportRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Vmq4MetzliBossSpecialTeleportRow> by
        lazy { DbHelper.table("dbtable.vmq4_metzli_boss_special_teleport").map { Vmq4MetzliBossSpecialTeleportRow(it) } }

    public fun all(): List<Vmq4MetzliBossSpecialTeleportRow> = cachedAll

    public fun getRow(row: Int): Vmq4MetzliBossSpecialTeleportRow = Vmq4MetzliBossSpecialTeleportRow(DbHelper.row(row))

    public fun getRow(column: String): Vmq4MetzliBossSpecialTeleportRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
