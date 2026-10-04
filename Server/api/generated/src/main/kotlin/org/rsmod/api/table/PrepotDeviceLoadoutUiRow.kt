// AUTO-GENERATED for dbtable.prepot_device_loadout_ui — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.component
import dev.openrune.types.dbcol.int
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class PrepotDeviceLoadoutUiRow(
  row: DbHelper,
) {
  public val loadoutId: Int = row.int("dbcol.prepot_device_loadout_ui:loadout_id")

  public val containerCom: ComponentType =
      row.component("dbcol.prepot_device_loadout_ui:container_com")

  public val contentsCom: ComponentType =
      row.component("dbcol.prepot_device_loadout_ui:contents_com")

  public val loadBtnCom: ComponentType =
      row.component("dbcol.prepot_device_loadout_ui:load_btn_com")

  public val saveBtnCom: ComponentType =
      row.component("dbcol.prepot_device_loadout_ui:save_btn_com")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PrepotDeviceLoadoutUiRow> by
        lazy { DbHelper.table("dbtable.prepot_device_loadout_ui").map { PrepotDeviceLoadoutUiRow(it) } }

    public fun all(): List<PrepotDeviceLoadoutUiRow> = cachedAll

    public fun getRow(row: Int): PrepotDeviceLoadoutUiRow = PrepotDeviceLoadoutUiRow(DbHelper.row(row))

    public fun getRow(column: String): PrepotDeviceLoadoutUiRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
