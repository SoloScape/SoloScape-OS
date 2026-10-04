// AUTO-GENERATED for dbtable.sailing_customisation_tab — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingCustomisationTabRow(
  row: DbHelper,
) {
  public val type: Int = row.int("dbcol.sailing_customisation_tab:type")

  public val tabId: Int = row.int("dbcol.sailing_customisation_tab:tab_id")

  public val tabName: String = row.string("dbcol.sailing_customisation_tab:tab_name")

  public val tabIcon: Int = row.column("dbcol.sailing_customisation_tab:tab_icon", GraphicIdCodec)

  public val facilityType: Int = row.int("dbcol.sailing_customisation_tab:facility_type")

  public val facilitySubtype: List<Int> =
      row.slotsOptional("dbcol.sailing_customisation_tab:facility_subtype", DbColumnCodec.IntCodec)

  public val facilityDesc: String? =
      row.stringOptional("dbcol.sailing_customisation_tab:facility_desc")

  public val offset: Int? = row.intOptional("dbcol.sailing_customisation_tab:offset")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingCustomisationTabRow> by
        lazy { DbHelper.table("dbtable.sailing_customisation_tab").map { SailingCustomisationTabRow(it) } }

    public fun all(): List<SailingCustomisationTabRow> = cachedAll

    public fun getRow(row: Int): SailingCustomisationTabRow = SailingCustomisationTabRow(DbHelper.row(row))

    public fun getRow(column: String): SailingCustomisationTabRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
