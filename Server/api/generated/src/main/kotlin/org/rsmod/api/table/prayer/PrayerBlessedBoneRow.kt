// AUTO-GENERATED for dbtable.prayer_blessed_bone — do not edit.
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

public class PrayerBlessedBoneRow(
  row: DbHelper,
) {
  public val input: ItemServerType = row.obj("dbcol.prayer_blessed_bone:input")

  public val statReq: List<Tuple2<StatType, Int>> =
      row.multiColumnMixed("dbcol.prayer_blessed_bone:stat_req", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val xp: Int = row.int("dbcol.prayer_blessed_bone:xp")

  public val output: ItemServerType = row.obj("dbcol.prayer_blessed_bone:output")

  public val category: String = row.string("dbcol.prayer_blessed_bone:category")

  public val inputAmount: Int = row.int("dbcol.prayer_blessed_bone:input_amount")

  public val outputAmount: Int = row.int("dbcol.prayer_blessed_bone:output_amount")

  public val shardCount: Int = row.int("dbcol.prayer_blessed_bone:shard_count")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PrayerBlessedBoneRow> by
        lazy { DbHelper.table("dbtable.prayer_blessed_bone").map { PrayerBlessedBoneRow(it) } }

    public fun all(): List<PrayerBlessedBoneRow> = cachedAll

    public fun getRow(row: Int): PrayerBlessedBoneRow = PrayerBlessedBoneRow(DbHelper.row(row))

    public fun getRow(column: String): PrayerBlessedBoneRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
