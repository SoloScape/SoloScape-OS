// AUTO-GENERATED for dbtable.hiscores_activity_info — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.VarpIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class HiscoresActivityInfoRow(
  row: DbHelper,
) {
  public val activityvarp: Int =
      row.column("dbcol.hiscores_activity_info:activityvarp", VarpIdCodec)

  public val activityname: String = row.string("dbcol.hiscores_activity_info:activityname")

  public val activityicon: Int =
      row.column("dbcol.hiscores_activity_info:activityicon", GraphicIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<HiscoresActivityInfoRow> by
        lazy { DbHelper.table("dbtable.hiscores_activity_info").map { HiscoresActivityInfoRow(it) } }

    public fun all(): List<HiscoresActivityInfoRow> = cachedAll

    public fun getRow(row: Int): HiscoresActivityInfoRow = HiscoresActivityInfoRow(DbHelper.row(row))

    public fun getRow(column: String): HiscoresActivityInfoRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
