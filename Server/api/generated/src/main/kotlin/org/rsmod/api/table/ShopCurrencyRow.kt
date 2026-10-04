// AUTO-GENERATED for dbtable.shop_currency — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class ShopCurrencyRow(
  row: DbHelper,
) {
  public val key: String = row.string("dbcol.shop_currency:key")

  public val singularName: String = row.string("dbcol.shop_currency:singular_name")

  public val pluralName: String = row.string("dbcol.shop_currency:plural_name")

  public val obj: ItemServerType? = row.objOptional("dbcol.shop_currency:obj")

  public val varbit: Int? = row.intOptional("dbcol.shop_currency:varbit")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ShopCurrencyRow> by
        lazy { DbHelper.table("dbtable.shop_currency").map { ShopCurrencyRow(it) } }

    public fun all(): List<ShopCurrencyRow> = cachedAll

    public fun getRow(row: Int): ShopCurrencyRow = ShopCurrencyRow(DbHelper.row(row))

    public fun getRow(column: String): ShopCurrencyRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
