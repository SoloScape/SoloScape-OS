// AUTO-GENERATED for dbtable.potion — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.PotionEffectRow

public class PotionRow(
  row: DbHelper,
) {
  public val key: String = row.string("dbcol.potion:key")

  public val name: String = row.string("dbcol.potion:name")

  public val items: List<ItemServerType> =
      row.list("dbcol.potion:items", DbColumnCodec.ItemServerTypeCodec)

  public val empty: ItemServerType = row.obj("dbcol.potion:empty")

  public val effect: PotionEffectRow by
      lazy { PotionEffectRow.getRow(row.dbRow("dbcol.potion:effect").id) }

  public val category: String = row.string("dbcol.potion:category")

  public val wildernessOnly: Boolean = row.boolean("dbcol.potion:wilderness_only")

  public val mix: Boolean = row.boolean("dbcol.potion:mix")

  public val heal: Int = row.int("dbcol.potion:heal")

  public val drinkDelay: Int = row.int("dbcol.potion:drink_delay")

  public val combatDelay: Int = row.int("dbcol.potion:combat_delay")

  public val minigameOnly: String = row.string("dbcol.potion:minigame_only")

  public val raidOnly: String = row.string("dbcol.potion:raid_only")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PotionRow> by
        lazy { DbHelper.table("dbtable.potion").map { PotionRow(it) } }

    public fun all(): List<PotionRow> = cachedAll

    public fun getRow(row: Int): PotionRow = PotionRow(DbHelper.row(row))

    public fun getRow(column: String): PotionRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
