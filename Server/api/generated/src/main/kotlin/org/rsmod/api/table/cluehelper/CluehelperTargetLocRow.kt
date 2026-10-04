// AUTO-GENERATED for dbtable.cluehelper_target_loc — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class CluehelperTargetLocRow(
  row: DbHelper,
) {
  public val loc: ObjectServerType = row.loc("dbcol.cluehelper_target_loc:loc")

  public val fallbackLoc: ObjectServerType? =
      row.columnOptional("dbcol.cluehelper_target_loc:fallback_loc", DbColumnCodec.LocTypeCodec)

  public val coord: CoordGrid = row.coord("dbcol.cluehelper_target_loc:coord")

  public val description: String = row.string("dbcol.cluehelper_target_loc:description")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperTargetLocRow> by
        lazy { DbHelper.table("dbtable.cluehelper_target_loc").map { CluehelperTargetLocRow(it) } }

    public fun all(): List<CluehelperTargetLocRow> = cachedAll

    public fun getRow(row: Int): CluehelperTargetLocRow = CluehelperTargetLocRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperTargetLocRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
