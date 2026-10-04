// AUTO-GENERATED for dbtable.hiscores_bosses_info — do not edit.
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

public class HiscoresBossesInfoRow(
  row: DbHelper,
) {
  public val bossname: String = row.string("dbcol.hiscores_bosses_info:bossname")

  public val bossicon: Int = row.column("dbcol.hiscores_bosses_info:bossicon", GraphicIdCodec)

  public val bossvarp: Int = row.column("dbcol.hiscores_bosses_info:bossvarp", VarpIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<HiscoresBossesInfoRow> by
        lazy { DbHelper.table("dbtable.hiscores_bosses_info").map { HiscoresBossesInfoRow(it) } }

    public fun all(): List<HiscoresBossesInfoRow> = cachedAll

    public fun getRow(row: Int): HiscoresBossesInfoRow = HiscoresBossesInfoRow(DbHelper.row(row))

    public fun getRow(column: String): HiscoresBossesInfoRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
