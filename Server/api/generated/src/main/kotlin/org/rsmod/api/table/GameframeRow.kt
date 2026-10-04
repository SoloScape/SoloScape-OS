// AUTO-GENERATED for dbtable.gameframe — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.enumTypeId
import dev.openrune.types.dbcol.int
import dev.openrune.types.enums.EnumTypeMap
import dev.openrune.types.enums.`enum`
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class GameframeRow(
  row: DbHelper,
) {
  public val toplevel: Int = row.int("dbcol.gameframe:toplevel")

  public val mappings: EnumTypeMap<ComponentType, ComponentType> =
      enum(row.enumTypeId("dbcol.gameframe:mappings"))

  public val clientMode: Int = row.int("dbcol.gameframe:client_mode")

  public val resizable: Boolean = row.boolean("dbcol.gameframe:resizable")

  public val default: Boolean = row.boolean("dbcol.gameframe:default")

  public val stoneArrangement: Boolean = row.boolean("dbcol.gameframe:stone_arrangement")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<GameframeRow> by
        lazy { DbHelper.table("dbtable.gameframe").map { GameframeRow(it) } }

    public fun all(): List<GameframeRow> = cachedAll

    public fun getRow(row: Int): GameframeRow = GameframeRow(DbHelper.row(row))

    public fun getRow(column: String): GameframeRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
