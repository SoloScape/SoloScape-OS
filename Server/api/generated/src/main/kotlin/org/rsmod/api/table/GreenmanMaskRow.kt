// AUTO-GENERATED for dbtable.greenman_mask — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.objOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class GreenmanMaskRow(
  row: DbHelper,
) {
  public val maskObject: ItemServerType = row.obj("dbcol.greenman_mask:mask_object")

  public val leafRequired: ItemServerType? = row.objOptional("dbcol.greenman_mask:leaf_required")

  public val leafRequiredAmount: Int? = row.intOptional("dbcol.greenman_mask:leaf_required_amount")

  public val unlockedBit: Int? = row.intOptional("dbcol.greenman_mask:unlocked_bit")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<GreenmanMaskRow> by
        lazy { DbHelper.table("dbtable.greenman_mask").map { GreenmanMaskRow(it) } }

    public fun all(): List<GreenmanMaskRow> = cachedAll

    public fun getRow(row: Int): GreenmanMaskRow = GreenmanMaskRow(DbHelper.row(row))

    public fun getRow(column: String): GreenmanMaskRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
