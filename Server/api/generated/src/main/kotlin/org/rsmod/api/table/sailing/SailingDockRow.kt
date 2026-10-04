// AUTO-GENERATED for dbtable.sailing_dock — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.QuestRow

public class SailingDockRow(
  row: DbHelper,
) {
  public val dockId: Int = row.int("dbcol.sailing_dock:dock_id")

  public val niceName: String = row.string("dbcol.sailing_dock:nice_name")

  public val inlineName: String? = row.stringOptional("dbcol.sailing_dock:inline_name")

  public val levelRequired: Int = row.int("dbcol.sailing_dock:level_required")

  public val questRequired: QuestRow? by
      lazy { row.columnOptional("dbcol.sailing_dock:quest_required", DbColumnCodec.DbRowTypeCodec)?.let { QuestRow.getRow(it.id) } }

  public val dockSpriteSmall: Int =
      row.column("dbcol.sailing_dock:dock_sprite_small", GraphicIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingDockRow> by
        lazy { DbHelper.table("dbtable.sailing_dock").map { SailingDockRow(it) } }

    public fun all(): List<SailingDockRow> = cachedAll

    public fun getRow(row: Int): SailingDockRow = SailingDockRow(DbHelper.row(row))

    public fun getRow(column: String): SailingDockRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
