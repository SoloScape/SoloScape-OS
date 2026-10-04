// AUTO-GENERATED for dbtable.stat_components — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.component
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.stat
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class StatComponentsRow(
  row: DbHelper,
) {
  public val component: ComponentType = row.component("dbcol.stat_components:component")

  public val stat: StatType = row.stat("dbcol.stat_components:stat")

  public val bit: Int = row.int("dbcol.stat_components:bit")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<StatComponentsRow> by
        lazy { DbHelper.table("dbtable.stat_components").map { StatComponentsRow(it) } }

    public fun all(): List<StatComponentsRow> = cachedAll

    public fun getRow(row: Int): StatComponentsRow = StatComponentsRow(DbHelper.row(row))

    public fun getRow(column: String): StatComponentsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
