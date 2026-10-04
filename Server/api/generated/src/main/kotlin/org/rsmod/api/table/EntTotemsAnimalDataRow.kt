// AUTO-GENERATED for dbtable.ent_totems_animal_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class EntTotemsAnimalDataRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<EntTotemsAnimalDataRow> by
        lazy { DbHelper.table("dbtable.ent_totems_animal_data").map { EntTotemsAnimalDataRow(it) } }

    public fun all(): List<EntTotemsAnimalDataRow> = cachedAll

    public fun getRow(row: Int): EntTotemsAnimalDataRow = EntTotemsAnimalDataRow(DbHelper.row(row))

    public fun getRow(column: String): EntTotemsAnimalDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
