// AUTO-GENERATED for dbtable.farming_patch — do not edit.
package org.rsmod.api.table.farming

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.VarpIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class FarmingPatchRow(
  row: DbHelper,
) {
  public val loc: ObjectServerType = row.loc("dbcol.farming_patch:loc")

  public val kind: String = row.string("dbcol.farming_patch:kind")

  public val varp: Int = row.column("dbcol.farming_patch:varp", VarpIdCodec)

  public val area: String = row.string("dbcol.farming_patch:area")

  public val centre: CoordGrid = row.coord("dbcol.farming_patch:centre")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FarmingPatchRow> by
        lazy { DbHelper.table("dbtable.farming_patch").map { FarmingPatchRow(it) } }

    public fun all(): List<FarmingPatchRow> = cachedAll

    public fun getRow(row: Int): FarmingPatchRow = FarmingPatchRow(DbHelper.row(row))

    public fun getRow(column: String): FarmingPatchRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
