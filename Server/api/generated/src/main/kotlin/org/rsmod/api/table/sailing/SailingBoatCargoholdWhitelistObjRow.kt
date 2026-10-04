// AUTO-GENERATED for dbtable.sailing_boat_cargohold_whitelist_obj — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.CategoryIdCodec
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.list
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingBoatCargoholdWhitelistObjRow(
  row: DbHelper,
) {
  public val entry: List<ItemServerType> =
      row.list("dbcol.sailing_boat_cargohold_whitelist_obj:entry", DbColumnCodec.ItemServerTypeCodec)

  public val entryCategory: List<Int> =
      row.list("dbcol.sailing_boat_cargohold_whitelist_obj:entry_category", CategoryIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatCargoholdWhitelistObjRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_cargohold_whitelist_obj").map { SailingBoatCargoholdWhitelistObjRow(it) } }

    public fun all(): List<SailingBoatCargoholdWhitelistObjRow> = cachedAll

    public fun getRow(row: Int): SailingBoatCargoholdWhitelistObjRow = SailingBoatCargoholdWhitelistObjRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatCargoholdWhitelistObjRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
