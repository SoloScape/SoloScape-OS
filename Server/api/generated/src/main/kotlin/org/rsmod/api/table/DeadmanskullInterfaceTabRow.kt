// AUTO-GENERATED for dbtable.deadmanskull_interface_tab — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.DBRowType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.StructIdCodec
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class DeadmanskullInterfaceTabRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.deadmanskull_interface_tab:name")

  public val tabNumber: Int = row.int("dbcol.deadmanskull_interface_tab:tab_number")

  public val combatSigil: List<Tuple2<Int, DBRowType>> =
      row.multiColumnMixedOptional("dbcol.deadmanskull_interface_tab:combat_sigil", StructIdCodec, DbColumnCodec.DbRowTypeCodec).toListOfTuple2()

  public val skillingSigil: List<Tuple2<Int, DBRowType>> =
      row.multiColumnMixedOptional("dbcol.deadmanskull_interface_tab:skilling_sigil", StructIdCodec, DbColumnCodec.DbRowTypeCodec).toListOfTuple2()

  public val utilitySigil: List<Tuple2<Int, DBRowType>> =
      row.multiColumnMixedOptional("dbcol.deadmanskull_interface_tab:utility_sigil", StructIdCodec, DbColumnCodec.DbRowTypeCodec).toListOfTuple2()

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DeadmanskullInterfaceTabRow> by
        lazy { DbHelper.table("dbtable.deadmanskull_interface_tab").map { DeadmanskullInterfaceTabRow(it) } }

    public fun all(): List<DeadmanskullInterfaceTabRow> = cachedAll

    public fun getRow(row: Int): DeadmanskullInterfaceTabRow = DeadmanskullInterfaceTabRow(DbHelper.row(row))

    public fun getRow(column: String): DeadmanskullInterfaceTabRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
