// AUTO-GENERATED for dbtable.omnishop_currency_data — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class OmnishopCurrencyDataRow(
  row: DbHelper,
) {
  public val omnishopCurrencyObj: List<ItemServerType> =
      row.slotsOptional("dbcol.omnishop_currency_data:omnishop_currency_obj", DbColumnCodec.ItemServerTypeCodec)

  public val omnishopCurrencyNameSingular: String =
      row.string("dbcol.omnishop_currency_data:omnishop_currency_name_singular")

  public val omnishopCurrencyNamePlural: String =
      row.string("dbcol.omnishop_currency_data:omnishop_currency_name_plural")

  public val omnishopCurrencyGraphic: List<Int> =
      row.slotsOptional("dbcol.omnishop_currency_data:omnishop_currency_graphic", GraphicIdCodec, GraphicIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<OmnishopCurrencyDataRow> by
        lazy { DbHelper.table("dbtable.omnishop_currency_data").map { OmnishopCurrencyDataRow(it) } }

    public fun all(): List<OmnishopCurrencyDataRow> = cachedAll

    public fun getRow(row: Int): OmnishopCurrencyDataRow = OmnishopCurrencyDataRow(DbHelper.row(row))

    public fun getRow(column: String): OmnishopCurrencyDataRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
