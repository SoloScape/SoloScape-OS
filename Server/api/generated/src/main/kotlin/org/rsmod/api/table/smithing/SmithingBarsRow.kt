// AUTO-GENERATED for dbtable.smithing_bars — do not edit.
package org.rsmod.api.table.smithing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class SmithingBarsRow(
  row: DbHelper,
) {
  public val input: List<ItemServerType> =
      row.list("dbcol.smithing_bars:input", DbColumnCodec.ItemServerTypeCodec)

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.smithing_bars:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.smithing_bars:xp")

  public val output: ItemServerType = row.obj("dbcol.smithing_bars:output")

  public val category: String = row.string("dbcol.smithing_bars:category")

  public val inputAmount: List<Int> =
      row.list("dbcol.smithing_bars:input_amount", DbColumnCodec.IntCodec)

  public val outputAmount: Int = row.int("dbcol.smithing_bars:output_amount")

  public val smithxp: Int = row.int("dbcol.smithing_bars:smithxp")

  public val smithxpalternate: Int? = row.intOptional("dbcol.smithing_bars:smithxpalternate")

  public val prefix: String = row.string("dbcol.smithing_bars:prefix")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SmithingBarsRow> by
        lazy { DbHelper.table("dbtable.smithing_bars").map { SmithingBarsRow(it) } }

    public fun all(): List<SmithingBarsRow> = cachedAll

    public fun getRow(row: Int): SmithingBarsRow = SmithingBarsRow(DbHelper.row(row))

    public fun getRow(column: String): SmithingBarsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
