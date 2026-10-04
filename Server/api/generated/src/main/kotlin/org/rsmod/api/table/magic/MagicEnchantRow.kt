// AUTO-GENERATED for dbtable.magic_enchant — do not edit.
package org.rsmod.api.table.magic

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class MagicEnchantRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<MagicEnchantRow> by
        lazy { DbHelper.table("dbtable.magic_enchant").map { MagicEnchantRow(it) } }

    public fun all(): List<MagicEnchantRow> = cachedAll

    public fun getRow(row: Int): MagicEnchantRow = MagicEnchantRow(DbHelper.row(row))

    public fun getRow(column: String): MagicEnchantRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
