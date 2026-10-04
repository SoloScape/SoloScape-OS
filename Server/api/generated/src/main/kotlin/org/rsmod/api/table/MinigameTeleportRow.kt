// AUTO-GENERATED for dbtable.minigame_teleport — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class MinigameTeleportRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.minigame_teleport:id")

  public val name: String = row.string("dbcol.minigame_teleport:name")

  public val membersOnly: Boolean? = row.booleanOptional("dbcol.minigame_teleport:members_only")

  public val minigameIcon: Int = row.column("dbcol.minigame_teleport:minigame_icon", GraphicIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<MinigameTeleportRow> by
        lazy { DbHelper.table("dbtable.minigame_teleport").map { MinigameTeleportRow(it) } }

    public fun all(): List<MinigameTeleportRow> = cachedAll

    public fun getRow(row: Int): MinigameTeleportRow = MinigameTeleportRow(DbHelper.row(row))

    public fun getRow(column: String): MinigameTeleportRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
