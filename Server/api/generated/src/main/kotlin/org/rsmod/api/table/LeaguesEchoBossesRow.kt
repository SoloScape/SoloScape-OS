// AUTO-GENERATED for dbtable.leagues_echo_bosses — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.StructIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class LeaguesEchoBossesRow(
  row: DbHelper,
) {
  public val echoOrbDroprate: Int = row.int("dbcol.leagues_echo_bosses:echo_orb_droprate")

  public val echoOrbObject: ItemServerType = row.obj("dbcol.leagues_echo_bosses:echo_orb_object")

  public val uniqueDrop: List<ItemServerType> =
      row.list("dbcol.leagues_echo_bosses:unique_drop", DbColumnCodec.ItemServerTypeCodec)

  public val uniqueDropRate: List<Int> =
      row.list("dbcol.leagues_echo_bosses:unique_drop_rate", DbColumnCodec.IntCodec)

  public val caData: Int = row.column("dbcol.leagues_echo_bosses:ca_data", StructIdCodec)

  public val description: String = row.string("dbcol.leagues_echo_bosses:description")

  public val difficulty: Int = row.int("dbcol.leagues_echo_bosses:difficulty")

  public val region: Int = row.int("dbcol.leagues_echo_bosses:region")

  public val name: String = row.string("dbcol.leagues_echo_bosses:name")

  public val requirements: String? = row.stringOptional("dbcol.leagues_echo_bosses:requirements")

  public val disabled: Boolean? = row.booleanOptional("dbcol.leagues_echo_bosses:disabled")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<LeaguesEchoBossesRow> by
        lazy { DbHelper.table("dbtable.leagues_echo_bosses").map { LeaguesEchoBossesRow(it) } }

    public fun all(): List<LeaguesEchoBossesRow> = cachedAll

    public fun getRow(row: Int): LeaguesEchoBossesRow = LeaguesEchoBossesRow(DbHelper.row(row))

    public fun getRow(column: String): LeaguesEchoBossesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
