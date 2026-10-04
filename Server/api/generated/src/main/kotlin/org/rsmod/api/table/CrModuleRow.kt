// AUTO-GENERATED for dbtable.cr_module — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.component
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.toListOfTuple3
import org.rsmod.api.table.toTuple3

public class CrModuleRow(
  row: DbHelper,
) {
  public val displayname: String = row.string("dbcol.cr_module:displayname")

  public val icon: List<Tuple3<Int, Int, Int>> =
      row.multiColumnMixed("dbcol.cr_module:icon", GraphicIdCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val iconOffset: Int? = row.intOptional("dbcol.cr_module:icon_offset")

  public val contentContainer: ComponentType = row.component("dbcol.cr_module:content_container")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CrModuleRow> by
        lazy { DbHelper.table("dbtable.cr_module").map { CrModuleRow(it) } }

    public fun all(): List<CrModuleRow> = cachedAll

    public fun getRow(row: Int): CrModuleRow = CrModuleRow(DbHelper.row(row))

    public fun getRow(column: String): CrModuleRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
