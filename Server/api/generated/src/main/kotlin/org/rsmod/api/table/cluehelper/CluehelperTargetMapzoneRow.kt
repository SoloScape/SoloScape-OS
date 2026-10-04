// AUTO-GENERATED for dbtable.cluehelper_target_mapzone — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class CluehelperTargetMapzoneRow(
  row: DbHelper,
) {
  public val coordSw: CoordGrid? =
      row.columnOptional("dbcol.cluehelper_target_mapzone:coord_sw", DbColumnCodec.CoordGridCodec)

  public val coordNe: CoordGrid? =
      row.columnOptional("dbcol.cluehelper_target_mapzone:coord_ne", DbColumnCodec.CoordGridCodec)

  public val description: String? =
      row.stringOptional("dbcol.cluehelper_target_mapzone:description")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperTargetMapzoneRow> by
        lazy { DbHelper.table("dbtable.cluehelper_target_mapzone").map { CluehelperTargetMapzoneRow(it) } }

    public fun all(): List<CluehelperTargetMapzoneRow> = cachedAll

    public fun getRow(row: Int): CluehelperTargetMapzoneRow = CluehelperTargetMapzoneRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperTargetMapzoneRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
