// AUTO-GENERATED for dbtable.slayer_task — do not edit.
package org.rsmod.api.table.slayer

import dev.openrune.definition.type.DBRowType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.slayer.SlayerUnlockRow
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toListOfTuple3
import org.rsmod.api.table.toTuple2
import org.rsmod.api.table.toTuple3

public class SlayerTaskRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.slayer_task:id")

  public val minComlevel: Int? = row.intOptional("dbcol.slayer_task:min_comlevel")

  public val minStatRequirementAll: List<Tuple2<Int, StatType>> =
      row.multiColumnMixedOptional("dbcol.slayer_task:min_stat_requirement_all", DbColumnCodec.IntCodec, DbColumnCodec.StatTypeCodec).toListOfTuple2()

  public val minStatRequirementAny: List<Tuple2<Int, StatType>> =
      row.multiColumnMixedOptional("dbcol.slayer_task:min_stat_requirement_any", DbColumnCodec.IntCodec, DbColumnCodec.StatTypeCodec).toListOfTuple2()

  public val leaguesMinComlevel: Int? = row.intOptional("dbcol.slayer_task:leagues_min_comlevel")

  public val leaguesMaxComlevel: Int? = row.intOptional("dbcol.slayer_task:leagues_max_comlevel")

  public val regions: List<Int> = row.list("dbcol.slayer_task:regions", DbColumnCodec.IntCodec)

  public val nameLowercase: String = row.string("dbcol.slayer_task:name_lowercase")

  public val nameUppercase: String = row.string("dbcol.slayer_task:name_uppercase")

  public val extensionMinMax: List<Tuple3<DBRowType, Int, Int>> =
      row.multiColumnMixedOptional("dbcol.slayer_task:extension_min_max", DbColumnCodec.DbRowTypeCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val extensionAdditive: List<Tuple3<DBRowType, Int, Int>> =
      row.multiColumnMixedOptional("dbcol.slayer_task:extension_additive", DbColumnCodec.DbRowTypeCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val unlockWeighting: List<Tuple2<DBRowType, Int>> =
      row.multiColumnMixedOptional("dbcol.slayer_task:unlock_weighting", DbColumnCodec.DbRowTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val blockUnlock: SlayerUnlockRow? by
      lazy { row.columnOptional("dbcol.slayer_task:block_unlock", DbColumnCodec.DbRowTypeCodec)?.let { SlayerUnlockRow.getRow(it.id) } }

  public val restrictedContent: Int? = row.intOptional("dbcol.slayer_task:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SlayerTaskRow> by
        lazy { DbHelper.table("dbtable.slayer_task").map { SlayerTaskRow(it) } }

    public fun all(): List<SlayerTaskRow> = cachedAll

    public fun getRow(row: Int): SlayerTaskRow = SlayerTaskRow(DbHelper.row(row))

    public fun getRow(column: String): SlayerTaskRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
