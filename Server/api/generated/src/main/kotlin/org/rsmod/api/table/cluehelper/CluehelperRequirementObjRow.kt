// AUTO-GENERATED for dbtable.cluehelper_requirement_obj — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.InvIdCodec
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CluehelperRequirementObjRow(
  row: DbHelper,
) {
  public val description: String = row.string("dbcol.cluehelper_requirement_obj:description")

  public val item: List<ItemServerType> =
      row.list("dbcol.cluehelper_requirement_obj:item", DbColumnCodec.ItemServerTypeCodec)

  public val inv: Int? = row.columnOptional("dbcol.cluehelper_requirement_obj:inv", InvIdCodec)

  public val count: Int? = row.intOptional("dbcol.cluehelper_requirement_obj:count")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperRequirementObjRow> by
        lazy { DbHelper.table("dbtable.cluehelper_requirement_obj").map { CluehelperRequirementObjRow(it) } }

    public fun all(): List<CluehelperRequirementObjRow> = cachedAll

    public fun getRow(row: Int): CluehelperRequirementObjRow = CluehelperRequirementObjRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperRequirementObjRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
