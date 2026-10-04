// AUTO-GENERATED for dbtable.dynamic_builders_demo_sets — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.StructIdCodec
import dev.openrune.types.dbcol.multiColumnMixed
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple5
import org.rsmod.api.table.toListOfTuple5
import org.rsmod.api.table.toTuple5

public class DynamicBuildersDemoSetsRow(
  row: DbHelper,
) {
  public val buttonStyles: List<Tuple5<Int, Int, Int, String, Boolean>> =
      row.multiColumnMixed("dbcol.dynamic_builders_demo_sets:button_styles", StructIdCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.StringCodec, DbColumnCodec.BooleanCodec).toListOfTuple5()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DynamicBuildersDemoSetsRow> by
        lazy { DbHelper.table("dbtable.dynamic_builders_demo_sets").map { DynamicBuildersDemoSetsRow(it) } }

    public fun all(): List<DynamicBuildersDemoSetsRow> = cachedAll

    public fun getRow(row: Int): DynamicBuildersDemoSetsRow = DynamicBuildersDemoSetsRow(DbHelper.row(row))

    public fun getRow(column: String): DynamicBuildersDemoSetsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
