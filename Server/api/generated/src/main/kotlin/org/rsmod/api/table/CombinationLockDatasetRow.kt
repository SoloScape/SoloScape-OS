// AUTO-GENERATED for dbtable.combination_lock_dataset — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.CombinationLockValuesRow

public class CombinationLockDatasetRow(
  row: DbHelper,
) {
  public val minLength: Int = row.int("dbcol.combination_lock_dataset:min_length")

  public val maxLength: Int = row.int("dbcol.combination_lock_dataset:max_length")

  public val valueType: Int = row.int("dbcol.combination_lock_dataset:value_type")

  public val values: List<CombinationLockValuesRow> by
      lazy { row.list("dbcol.combination_lock_dataset:values", DbColumnCodec.DbRowTypeCodec).map { CombinationLockValuesRow.getRow(it.id) } }

  public val randomiseStart: Boolean? =
      row.booleanOptional("dbcol.combination_lock_dataset:randomise_start")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CombinationLockDatasetRow> by
        lazy { DbHelper.table("dbtable.combination_lock_dataset").map { CombinationLockDatasetRow(it) } }

    public fun all(): List<CombinationLockDatasetRow> = cachedAll

    public fun getRow(row: Int): CombinationLockDatasetRow = CombinationLockDatasetRow(DbHelper.row(row))

    public fun getRow(column: String): CombinationLockDatasetRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
