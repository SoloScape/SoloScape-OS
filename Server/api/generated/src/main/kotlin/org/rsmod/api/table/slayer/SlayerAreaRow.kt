// AUTO-GENERATED for dbtable.slayer_area — do not edit.
package org.rsmod.api.table.slayer

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SlayerAreaRow(
  row: DbHelper,
) {
  public val areaId: Int = row.int("dbcol.slayer_area:area_id")

  public val areaText: String = row.string("dbcol.slayer_area:area_text")

  public val areaNameInHelper: String = row.string("dbcol.slayer_area:area_name_in_helper")

  public val areaHint: String = row.string("dbcol.slayer_area:area_hint")

  public val restrictedContent: Int? = row.intOptional("dbcol.slayer_area:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SlayerAreaRow> by
        lazy { DbHelper.table("dbtable.slayer_area").map { SlayerAreaRow(it) } }

    public fun all(): List<SlayerAreaRow> = cachedAll

    public fun getRow(row: Int): SlayerAreaRow = SlayerAreaRow(DbHelper.row(row))

    public fun getRow(column: String): SlayerAreaRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
