// AUTO-GENERATED for dbtable.vmq4_crypt_waves — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class Vmq4CryptWavesRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<Vmq4CryptWavesRow> by
        lazy { DbHelper.table("dbtable.vmq4_crypt_waves").map { Vmq4CryptWavesRow(it) } }

    public fun all(): List<Vmq4CryptWavesRow> = cachedAll

    public fun getRow(row: Int): Vmq4CryptWavesRow = Vmq4CryptWavesRow(DbHelper.row(row))

    public fun getRow(column: String): Vmq4CryptWavesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
