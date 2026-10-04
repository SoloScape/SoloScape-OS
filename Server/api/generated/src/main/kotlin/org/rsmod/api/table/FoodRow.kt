// AUTO-GENERATED for dbtable.food — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class FoodRow(
  row: DbHelper,
) {
  public val items: List<ItemServerType> =
      row.list("dbcol.food:items", DbColumnCodec.ItemServerTypeCodec)

  public val heal: Int = row.int("dbcol.food:heal")

  public val combo: Boolean = row.boolean("dbcol.food:combo")

  public val effect: String = row.string("dbcol.food:effect")

  public val overheal: Boolean = row.boolean("dbcol.food:overheal")

  public val eatDelay: List<Int> = row.slotsOptional("dbcol.food:eat_delay", DbColumnCodec.IntCodec)

  public val combatDelay: List<Int> =
      row.slotsOptional("dbcol.food:combat_delay", DbColumnCodec.IntCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FoodRow> by
        lazy { DbHelper.table("dbtable.food").map { FoodRow(it) } }

    public fun all(): List<FoodRow> = cachedAll

    public fun getRow(row: Int): FoodRow = FoodRow(DbHelper.row(row))

    public fun getRow(column: String): FoodRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
