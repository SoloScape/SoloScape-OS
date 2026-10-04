// AUTO-GENERATED for dbtable.cluehelper_target_coord — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class CluehelperTargetCoordRow(
  row: DbHelper,
) {
  public val coord: CoordGrid = row.coord("dbcol.cluehelper_target_coord:coord")

  public val description: String = row.string("dbcol.cluehelper_target_coord:description")

  public val descriptionShort: String? =
      row.stringOptional("dbcol.cluehelper_target_coord:description_short")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperTargetCoordRow> by
        lazy { DbHelper.table("dbtable.cluehelper_target_coord").map { CluehelperTargetCoordRow(it) } }

    public fun all(): List<CluehelperTargetCoordRow> = cachedAll

    public fun getRow(row: Int): CluehelperTargetCoordRow = CluehelperTargetCoordRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperTargetCoordRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
