// AUTO-GENERATED for dbtable.slayer_master_task — do not edit.
package org.rsmod.api.table.slayer

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.slayer.SlayerAreaRow
import org.rsmod.api.table.slayer.SlayerTaskRow
import org.rsmod.api.table.slayer.SlayerUnlockRow

public class SlayerMasterTaskRow(
  row: DbHelper,
) {
  public val masterId: Int = row.int("dbcol.slayer_master_task:master_id")

  public val task: SlayerTaskRow by
      lazy { SlayerTaskRow.getRow(row.dbRow("dbcol.slayer_master_task:task").id) }

  public val weight: Int = row.int("dbcol.slayer_master_task:weight")

  public val minAmount: Int = row.int("dbcol.slayer_master_task:min_amount")

  public val maxAmount: Int = row.int("dbcol.slayer_master_task:max_amount")

  public val areas: List<SlayerAreaRow> by
      lazy { row.slotsOptional("dbcol.slayer_master_task:areas", DbColumnCodec.DbRowTypeCodec).map { SlayerAreaRow.getRow(it.id) } }

  public val taskUnlock: SlayerUnlockRow? by
      lazy { row.columnOptional("dbcol.slayer_master_task:task_unlock", DbColumnCodec.DbRowTypeCodec)?.let { SlayerUnlockRow.getRow(it.id) } }

  public val modifier: List<Int> =
      row.slotsOptional("dbcol.slayer_master_task:modifier", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val skillGuideIcon: ItemServerType? =
      row.objOptional("dbcol.slayer_master_task:skill_guide_icon")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SlayerMasterTaskRow> by
        lazy { DbHelper.table("dbtable.slayer_master_task").map { SlayerMasterTaskRow(it) } }

    public fun all(): List<SlayerMasterTaskRow> = cachedAll

    public fun getRow(row: Int): SlayerMasterTaskRow = SlayerMasterTaskRow(DbHelper.row(row))

    public fun getRow(column: String): SlayerMasterTaskRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
