// AUTO-GENERATED for dbtable.omnishop_shop_data — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.DBRowType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.InvIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.enumTypeIdOptional
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import dev.openrune.types.enums.EnumTypeMap
import dev.openrune.types.enums.`enum`
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.OmnishopCurrencyDataRow
import org.rsmod.api.table.OmnishopStockDataRow

public class OmnishopShopDataRow(
  row: DbHelper,
) {
  public val omnishopShopName: String = row.string("dbcol.omnishop_shop_data:omnishop_shop_name")

  public val omnishopShopInv: Int? =
      row.columnOptional("dbcol.omnishop_shop_data:omnishop_shop_inv", InvIdCodec)

  public val omnishopShopCurrency: List<OmnishopCurrencyDataRow> by
      lazy { row.slotsOptional("dbcol.omnishop_shop_data:omnishop_shop_currency", DbColumnCodec.DbRowTypeCodec).map { OmnishopCurrencyDataRow.getRow(it.id) } }

  public val omnishopShopFilterTitles: EnumTypeMap<Int, String>? =
      row.enumTypeIdOptional("dbcol.omnishop_shop_data:omnishop_shop_filter_titles")?.let { enum(it) }

  public val omnishopShopStock: List<OmnishopStockDataRow> by
      lazy { row.slotsOptional("dbcol.omnishop_shop_data:omnishop_shop_stock", DbColumnCodec.DbRowTypeCodec).map { OmnishopStockDataRow.getRow(it.id) } }

  public val omnishopShopCostModBuy: Int? =
      row.intOptional("dbcol.omnishop_shop_data:omnishop_shop_cost_mod_buy")

  public val omnishopShopCostModSell: Int? =
      row.intOptional("dbcol.omnishop_shop_data:omnishop_shop_cost_mod_sell")

  public val omnishopShopCostModHaggle: Int? =
      row.intOptional("dbcol.omnishop_shop_data:omnishop_shop_cost_mod_haggle")

  public val omnishopShopCostCurrency: DBRowType? =
      row.columnOptional("dbcol.omnishop_shop_data:omnishop_shop_cost_currency", DbColumnCodec.DbRowTypeCodec)

  public val omnishopShopInfoTitle: String =
      row.string("dbcol.omnishop_shop_data:omnishop_shop_info_title")

  public val omnishopShopInfoIntroDesc: String? =
      row.stringOptional("dbcol.omnishop_shop_data:omnishop_shop_info_intro_desc")

  public val omnishopShopInfoInstructions: String? =
      row.stringOptional("dbcol.omnishop_shop_data:omnishop_shop_info_instructions")

  public val omnishopShopMainOpText: String? =
      row.stringOptional("dbcol.omnishop_shop_data:omnishop_shop_main_op_text")

  public val omnishopShopSideOpText: String? =
      row.stringOptional("dbcol.omnishop_shop_data:omnishop_shop_side_op_text")

  public val omnishopShopCostHide: Boolean? =
      row.booleanOptional("dbcol.omnishop_shop_data:omnishop_shop_cost_hide")

  public val omnishopShopAllowSelling: Int? =
      row.intOptional("dbcol.omnishop_shop_data:omnishop_shop_allow_selling")

  public val omnishopShopShowStock: Boolean? =
      row.booleanOptional("dbcol.omnishop_shop_data:omnishop_shop_show_stock")

  public val omnishopShopShowCostInInfo: Boolean? =
      row.booleanOptional("dbcol.omnishop_shop_data:omnishop_shop_show_cost_in_info")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<OmnishopShopDataRow> by
        lazy { DbHelper.table("dbtable.omnishop_shop_data").map { OmnishopShopDataRow(it) } }

    public fun all(): List<OmnishopShopDataRow> = cachedAll

    public fun getRow(row: Int): OmnishopShopDataRow = OmnishopShopDataRow(DbHelper.row(row))

    public fun getRow(column: String): OmnishopShopDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
