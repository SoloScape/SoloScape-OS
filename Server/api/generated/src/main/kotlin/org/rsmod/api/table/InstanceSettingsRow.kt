// AUTO-GENERATED for dbtable.instance_settings — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.NpcServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class InstanceSettingsRow(
  row: DbHelper,
) {
  public val key: String = row.string("dbcol.instance_settings:key")

  public val exitCoord: CoordGrid = row.coord("dbcol.instance_settings:exit_coord")

  public val fee: Int = row.int("dbcol.instance_settings:fee")

  public val maxPlayers: Int = row.int("dbcol.instance_settings:max_players")

  public val timeLimitMinutes: Int = row.int("dbcol.instance_settings:time_limit_minutes")

  public val graceMinutes: Int = row.int("dbcol.instance_settings:grace_minutes")

  public val bossNpc: List<NpcServerType> =
      row.list("dbcol.instance_settings:boss_npc", DbColumnCodec.NpcTypeCodec)

  public val bossName: String = row.string("dbcol.instance_settings:boss_name")

  public val recommendedCombat: List<Int> =
      row.list("dbcol.instance_settings:recommended_combat", DbColumnCodec.IntCodec)

  public val teamSize: Int = row.int("dbcol.instance_settings:team_size")

  public val lootMultiplier: String = row.string("dbcol.instance_settings:loot_multiplier")

  public val description: String = row.string("dbcol.instance_settings:description")

  public val enterCoord: CoordGrid = row.coord("dbcol.instance_settings:enter_coord")

  public val enterObject: List<ObjectServerType> =
      row.list("dbcol.instance_settings:enter_object", DbColumnCodec.LocTypeCodec)

  public val exitObject: List<ObjectServerType> =
      row.list("dbcol.instance_settings:exit_object", DbColumnCodec.LocTypeCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<InstanceSettingsRow> by
        lazy { DbHelper.table("dbtable.instance_settings").map { InstanceSettingsRow(it) } }

    public fun all(): List<InstanceSettingsRow> = cachedAll

    public fun getRow(row: Int): InstanceSettingsRow = InstanceSettingsRow(DbHelper.row(row))

    public fun getRow(column: String): InstanceSettingsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
