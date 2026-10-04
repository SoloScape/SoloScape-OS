// AUTO-GENERATED for dbtable.prayer_ectofuntus_bonemeal — do not edit.
package org.rsmod.api.table.prayer

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class PrayerEctofuntusBonemealRow(
  row: DbHelper,
) {
  public val input: ItemServerType = row.obj("dbcol.prayer_ectofuntus_bonemeal:input")

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.prayer_ectofuntus_bonemeal:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.prayer_ectofuntus_bonemeal:xp")

  public val output: ItemServerType = row.obj("dbcol.prayer_ectofuntus_bonemeal:output")

  public val category: String = row.string("dbcol.prayer_ectofuntus_bonemeal:category")

  public val inputAmount: Int = row.int("dbcol.prayer_ectofuntus_bonemeal:input_amount")

  public val outputAmount: Int = row.int("dbcol.prayer_ectofuntus_bonemeal:output_amount")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PrayerEctofuntusBonemealRow> by
        lazy { DbHelper.table("dbtable.prayer_ectofuntus_bonemeal").map { PrayerEctofuntusBonemealRow(it) } }

    public fun all(): List<PrayerEctofuntusBonemealRow> = cachedAll

    public fun getRow(row: Int): PrayerEctofuntusBonemealRow = PrayerEctofuntusBonemealRow(DbHelper.row(row))

    public fun getRow(column: String): PrayerEctofuntusBonemealRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
