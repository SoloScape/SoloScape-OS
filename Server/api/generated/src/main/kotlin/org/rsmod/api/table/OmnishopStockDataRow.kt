// AUTO-GENERATED for dbtable.omnishop_stock_data — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.DBRowType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.sailing.SailingBoatRow
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class OmnishopStockDataRow(
  row: DbHelper,
) {
  public val omnishopStockObj: ItemServerType =
      row.obj("dbcol.omnishop_stock_data:omnishop_stock_obj")

  public val omnishopStockAlternateobj: ItemServerType? =
      row.objOptional("dbcol.omnishop_stock_data:omnishop_stock_alternateobj")

  public val omnishopStockDisplayobj: ItemServerType? =
      row.objOptional("dbcol.omnishop_stock_data:omnishop_stock_displayobj")

  public val omnishopStockFilterId: List<Int> =
      row.slotsOptional("dbcol.omnishop_stock_data:omnishop_stock_filter_id", DbColumnCodec.IntCodec)

  public val omnishopStockCost: List<Tuple2<DBRowType, Int>> =
      row.multiColumnMixedOptional("dbcol.omnishop_stock_data:omnishop_stock_cost", DbColumnCodec.DbRowTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val omnishopStockCostModBuy: Int? =
      row.intOptional("dbcol.omnishop_stock_data:omnishop_stock_cost_mod_buy")

  public val omnishopStockCostModSell: Int? =
      row.intOptional("dbcol.omnishop_stock_data:omnishop_stock_cost_mod_sell")

  public val omnishopStockCostModHaggle: Int? =
      row.intOptional("dbcol.omnishop_stock_data:omnishop_stock_cost_mod_haggle")

  public val omnishopStockTransactionMultiplier: Int? =
      row.intOptional("dbcol.omnishop_stock_data:omnishop_stock_transaction_multiplier")

  public val omnishopStockRestricted: Int? =
      row.intOptional("dbcol.omnishop_stock_data:omnishop_stock_restricted")

  public val omnishopStockRestrictedCategory: Int? =
      row.intOptional("dbcol.omnishop_stock_data:omnishop_stock_restricted_category")

  public val omnishopStockRestrictedUim: Int? =
      row.intOptional("dbcol.omnishop_stock_data:omnishop_stock_restricted_uim")

  public val omnishopStockMaxPurchase: Int? =
      row.intOptional("dbcol.omnishop_stock_data:omnishop_stock_max_purchase")

  public val omnishopStockHideCount: Boolean? =
      row.booleanOptional("dbcol.omnishop_stock_data:omnishop_stock_hide_count")

  public val omnishopStockShowUnlimited: Int? =
      row.intOptional("dbcol.omnishop_stock_data:omnishop_stock_show_unlimited")

  public val omnishopStockBuyable: Boolean? =
      row.booleanOptional("dbcol.omnishop_stock_data:omnishop_stock_buyable")

  public val omnishopStockSellable: Boolean? =
      row.booleanOptional("dbcol.omnishop_stock_data:omnishop_stock_sellable")

  public val omnishopStockSoldNoted: Boolean? =
      row.booleanOptional("dbcol.omnishop_stock_data:omnishop_stock_sold_noted")

  public val omnishopStockViewOnly: Boolean? =
      row.booleanOptional("dbcol.omnishop_stock_data:omnishop_stock_view_only")

  public val omnishopStockNameOverride: String? =
      row.stringOptional("dbcol.omnishop_stock_data:omnishop_stock_name_override")

  public val omnishopStockDescriptionDynamic: SailingBoatRow? by
      lazy { row.columnOptional("dbcol.omnishop_stock_data:omnishop_stock_description_dynamic", DbColumnCodec.DbRowTypeCodec)?.let { SailingBoatRow.getRow(it.id) } }

  public val omnishopStockUseShortname: Boolean? =
      row.booleanOptional("dbcol.omnishop_stock_data:omnishop_stock_use_shortname")

  public val omnishopStockShortname: String? =
      row.stringOptional("dbcol.omnishop_stock_data:omnishop_stock_shortname")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<OmnishopStockDataRow> by
        lazy { DbHelper.table("dbtable.omnishop_stock_data").map { OmnishopStockDataRow(it) } }

    public fun all(): List<OmnishopStockDataRow> = cachedAll

    public fun getRow(row: Int): OmnishopStockDataRow = OmnishopStockDataRow(DbHelper.row(row))

    public fun getRow(column: String): OmnishopStockDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
