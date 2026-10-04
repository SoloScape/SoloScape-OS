// AUTO-GENERATED for dbtable.sailing_bt_trial_core — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingBtTrialCoreRow(
  row: DbHelper,
) {
  public val trialName: String = row.string("dbcol.sailing_bt_trial_core:trial_name")

  public val trackerIcon1: Int =
      row.column("dbcol.sailing_bt_trial_core:tracker_icon1", GraphicIdCodec)

  public val trackerIcon2: Int =
      row.column("dbcol.sailing_bt_trial_core:tracker_icon2", GraphicIdCodec)

  public val trackerIcon3: Int? =
      row.columnOptional("dbcol.sailing_bt_trial_core:tracker_icon3", GraphicIdCodec)

  public val trackerIcon4: Int? =
      row.columnOptional("dbcol.sailing_bt_trial_core:tracker_icon4", GraphicIdCodec)

  public val primaryReqDesc: String = row.string("dbcol.sailing_bt_trial_core:primary_req_desc")

  public val secondaryReqDesc: String = row.string("dbcol.sailing_bt_trial_core:secondary_req_desc")

  public val rankData: List<Int> =
      row.multiColumn("dbcol.sailing_bt_trial_core:rank_data", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val rewardSwordfish: ItemServerType =
      row.obj("dbcol.sailing_bt_trial_core:reward_swordfish")

  public val rewardShark: ItemServerType = row.obj("dbcol.sailing_bt_trial_core:reward_shark")

  public val rewardMarlin: ItemServerType = row.obj("dbcol.sailing_bt_trial_core:reward_marlin")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBtTrialCoreRow> by
        lazy { DbHelper.table("dbtable.sailing_bt_trial_core").map { SailingBtTrialCoreRow(it) } }

    public fun all(): List<SailingBtTrialCoreRow> = cachedAll

    public fun getRow(row: Int): SailingBtTrialCoreRow = SailingBtTrialCoreRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBtTrialCoreRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
