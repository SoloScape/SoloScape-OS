// AUTO-GENERATED for dbtable.reward_selection — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.RewardRow

public class RewardSelectionRow(
  row: DbHelper,
) {
  public val reward: List<RewardRow> by
      lazy { row.slotsOptional("dbcol.reward_selection:reward", DbColumnCodec.DbRowTypeCodec).map { RewardRow.getRow(it.id) } }

  public val displayGraphic: Int? =
      row.columnOptional("dbcol.reward_selection:display_graphic", GraphicIdCodec)

  public val displayObject: ItemServerType? =
      row.objOptional("dbcol.reward_selection:display_object")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<RewardSelectionRow> by
        lazy { DbHelper.table("dbtable.reward_selection").map { RewardSelectionRow(it) } }

    public fun all(): List<RewardSelectionRow> = cachedAll

    public fun getRow(row: Int): RewardSelectionRow = RewardSelectionRow(DbHelper.row(row))

    public fun getRow(column: String): RewardSelectionRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
