// AUTO-GENERATED for dbtable.light_sources — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class LightSourcesRow(
  row: DbHelper,
) {
  public val unlit: ItemServerType = row.obj("dbcol.light_sources:unlit")

  public val lit: ItemServerType = row.obj("dbcol.light_sources:lit")

  public val level: Int = row.int("dbcol.light_sources:level")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<LightSourcesRow> by
        lazy { DbHelper.table("dbtable.light_sources").map { LightSourcesRow(it) } }

    public fun all(): List<LightSourcesRow> = cachedAll

    public fun getRow(row: Int): LightSourcesRow = LightSourcesRow(DbHelper.row(row))

    public fun getRow(column: String): LightSourcesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
