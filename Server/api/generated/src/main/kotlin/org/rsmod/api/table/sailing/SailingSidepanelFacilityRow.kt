// AUTO-GENERATED for dbtable.sailing_sidepanel_facility — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.sailing.SailingSidepanelFacilityRow
import org.rsmod.api.table.sailing.SailingSidepanelWidgetButtonRow

public class SailingSidepanelFacilityRow(
  row: DbHelper,
) {
  public val widget: List<SailingSidepanelWidgetButtonRow> by
      lazy { row.list("dbcol.sailing_sidepanel_facility:widget", DbColumnCodec.DbRowTypeCodec).map { SailingSidepanelWidgetButtonRow.getRow(it.id) } }

  public val facilityCanLockIn: Boolean? =
      row.booleanOptional("dbcol.sailing_sidepanel_facility:facility_can_lock_in")

  public val facilityCanBeAssigned: Boolean =
      row.boolean("dbcol.sailing_sidepanel_facility:facility_can_be_assigned")

  public val linkedFacility: SailingSidepanelFacilityRow? by
      lazy { row.columnOptional("dbcol.sailing_sidepanel_facility:linked_facility", DbColumnCodec.DbRowTypeCodec)?.let { SailingSidepanelFacilityRow.getRow(it.id) } }

  public val sidepanelPriorityType: Int? =
      row.intOptional("dbcol.sailing_sidepanel_facility:sidepanel_priority_type")

  public val icon: Int = row.column("dbcol.sailing_sidepanel_facility:icon", GraphicIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingSidepanelFacilityRow> by
        lazy { DbHelper.table("dbtable.sailing_sidepanel_facility").map { SailingSidepanelFacilityRow(it) } }

    public fun all(): List<SailingSidepanelFacilityRow> = cachedAll

    public fun getRow(row: Int): SailingSidepanelFacilityRow = SailingSidepanelFacilityRow(DbHelper.row(row))

    public fun getRow(column: String): SailingSidepanelFacilityRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
