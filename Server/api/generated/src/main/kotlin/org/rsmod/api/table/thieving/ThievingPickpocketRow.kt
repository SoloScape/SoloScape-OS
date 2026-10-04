// AUTO-GENERATED for dbtable.thieving_pickpocket — do not edit.
package org.rsmod.api.table.thieving

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.Tuple4
import org.rsmod.api.table.toListOfTuple3
import org.rsmod.api.table.toListOfTuple4
import org.rsmod.api.table.toTuple3
import org.rsmod.api.table.toTuple4

public class ThievingPickpocketRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.thieving_pickpocket:name")

  public val level: Int = row.int("dbcol.thieving_pickpocket:level")

  public val xp: Int = row.int("dbcol.thieving_pickpocket:xp")

  public val low: Int = row.int("dbcol.thieving_pickpocket:low")

  public val high: Int = row.int("dbcol.thieving_pickpocket:high")

  public val stunTicks: Int = row.int("dbcol.thieving_pickpocket:stun_ticks")

  public val stunDamage: Int = row.int("dbcol.thieving_pickpocket:stun_damage")

  public val guaranteed: List<Tuple3<ItemServerType, Int, Int>> =
      row.multiColumnMixedOptional("dbcol.thieving_pickpocket:guaranteed", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val loot: List<Tuple4<ItemServerType, Int, Int, Int>> =
      row.multiColumnMixedOptional("dbcol.thieving_pickpocket:loot", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple4()

  public val symbolPrefixes: List<String> =
      row.slotsOptional("dbcol.thieving_pickpocket:symbol_prefixes", DbColumnCodec.StringCodec)

  public val pouch: ItemServerType? = row.objOptional("dbcol.thieving_pickpocket:pouch")

  public val caughtShout: String = row.string("dbcol.thieving_pickpocket:caught_shout")

  public val lowercaseName: Boolean = row.boolean("dbcol.thieving_pickpocket:lowercase_name")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ThievingPickpocketRow> by
        lazy { DbHelper.table("dbtable.thieving_pickpocket").map { ThievingPickpocketRow(it) } }

    public fun all(): List<ThievingPickpocketRow> = cachedAll

    public fun getRow(row: Int): ThievingPickpocketRow = ThievingPickpocketRow(DbHelper.row(row))

    public fun getRow(column: String): ThievingPickpocketRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
