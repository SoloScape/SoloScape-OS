// AUTO-GENERATED for dbtable.combination_lock_values — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CombinationLockValuesRow(
  row: DbHelper,
) {
  public val stringValue: List<String> =
      row.slotsOptional("dbcol.combination_lock_values:string_value", DbColumnCodec.StringCodec)

  public val graphicValue: List<Int> =
      row.slotsOptional("dbcol.combination_lock_values:graphic_value", GraphicIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CombinationLockValuesRow> by
        lazy { DbHelper.table("dbtable.combination_lock_values").map { CombinationLockValuesRow(it) } }

    public fun all(): List<CombinationLockValuesRow> = cachedAll

    public fun getRow(row: Int): CombinationLockValuesRow = CombinationLockValuesRow(DbHelper.row(row))

    public fun getRow(column: String): CombinationLockValuesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
