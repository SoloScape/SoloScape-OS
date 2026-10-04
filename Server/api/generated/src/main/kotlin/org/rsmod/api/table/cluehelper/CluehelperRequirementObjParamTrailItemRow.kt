// AUTO-GENERATED for dbtable.cluehelper_requirement_obj_param_trail_item — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CluehelperRequirementObjParamTrailItemRow(
  row: DbHelper,
) {
  public val description: String =
      row.string("dbcol.cluehelper_requirement_obj_param_trail_item:description")

  public val itemGroup: Int =
      row.int("dbcol.cluehelper_requirement_obj_param_trail_item:item_group")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperRequirementObjParamTrailItemRow> by
        lazy { DbHelper.table("dbtable.cluehelper_requirement_obj_param_trail_item").map { CluehelperRequirementObjParamTrailItemRow(it) } }

    public fun all(): List<CluehelperRequirementObjParamTrailItemRow> = cachedAll

    public fun getRow(row: Int): CluehelperRequirementObjParamTrailItemRow = CluehelperRequirementObjParamTrailItemRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperRequirementObjParamTrailItemRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
