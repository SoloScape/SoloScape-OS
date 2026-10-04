// AUTO-GENERATED for dbtable.mining_rocks — do not edit.
package org.rsmod.api.table.mining

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.objOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class MiningRocksRow(
  row: DbHelper,
) {
  public val rockObject: List<ObjectServerType> =
      row.list("dbcol.mining_rocks:rock_object", DbColumnCodec.LocTypeCodec)

  public val level: Int = row.int("dbcol.mining_rocks:level")

  public val xp: Int = row.int("dbcol.mining_rocks:xp")

  public val oreItem: ItemServerType? = row.objOptional("dbcol.mining_rocks:ore_item")

  public val respawnCycles: Int = row.int("dbcol.mining_rocks:respawn_cycles")

  public val successRateLow: Int = row.int("dbcol.mining_rocks:success_rate_low")

  public val successRateHigh: Int = row.int("dbcol.mining_rocks:success_rate_high")

  public val depleteMechanic: Int = row.int("dbcol.mining_rocks:deplete_mechanic")

  public val emptyRockObject: ObjectServerType? =
      row.columnOptional("dbcol.mining_rocks:empty_rock_object", DbColumnCodec.LocTypeCodec)

  public val clueBaseChance: Int = row.int("dbcol.mining_rocks:clue_base_chance")

  public val depleteMinAmount: Int? = row.intOptional("dbcol.mining_rocks:deplete_min_amount")

  public val depleteMaxAmount: Int? = row.intOptional("dbcol.mining_rocks:deplete_max_amount")

  public val miningWall: Boolean = row.boolean("dbcol.mining_rocks:mining_wall")

  public val miningGloves: Int = row.int("dbcol.mining_rocks:mining_gloves")

  public val varrockArmourLevel: Int = row.int("dbcol.mining_rocks:varrock_armour_level")

  public val miningCape: Boolean = row.boolean("dbcol.mining_rocks:mining_cape")

  public val celestialRing: Boolean = row.boolean("dbcol.mining_rocks:celestial_ring")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<MiningRocksRow> by
        lazy { DbHelper.table("dbtable.mining_rocks").map { MiningRocksRow(it) } }

    public fun all(): List<MiningRocksRow> = cachedAll

    public fun getRow(row: Int): MiningRocksRow = MiningRocksRow(DbHelper.row(row))

    public fun getRow(column: String): MiningRocksRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
