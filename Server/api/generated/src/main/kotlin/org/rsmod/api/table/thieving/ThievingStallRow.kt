// AUTO-GENERATED for dbtable.thieving_stall — do not edit.
package org.rsmod.api.table.thieving

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.NpcServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple4
import org.rsmod.api.table.toListOfTuple4
import org.rsmod.api.table.toTuple4

public class ThievingStallRow(
  row: DbHelper,
) {
  public val loc: ObjectServerType = row.loc("dbcol.thieving_stall:loc")

  public val level: Int = row.int("dbcol.thieving_stall:level")

  public val xp: Int = row.int("dbcol.thieving_stall:xp")

  public val loot: List<Tuple4<ItemServerType, Int, Int, Int>> =
      row.multiColumnMixed("dbcol.thieving_stall:loot", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple4()

  public val empty: ObjectServerType? =
      row.columnOptional("dbcol.thieving_stall:empty", DbColumnCodec.LocTypeCodec)

  public val respawn: Int = row.int("dbcol.thieving_stall:respawn")

  public val owners: List<NpcServerType> =
      row.list("dbcol.thieving_stall:owners", DbColumnCodec.NpcTypeCodec)

  public val guards: List<NpcServerType> =
      row.slotsOptional("dbcol.thieving_stall:guards", DbColumnCodec.NpcTypeCodec)

  public val attemptMessage: String? = row.stringOptional("dbcol.thieving_stall:attempt_message")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ThievingStallRow> by
        lazy { DbHelper.table("dbtable.thieving_stall").map { ThievingStallRow(it) } }

    public fun all(): List<ThievingStallRow> = cachedAll

    public fun getRow(row: Int): ThievingStallRow = ThievingStallRow(DbHelper.row(row))

    public fun getRow(column: String): ThievingStallRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
