// AUTO-GENERATED for dbtable.fishing_method — do not edit.
package org.rsmod.api.table.fishing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class FishingMethodRow(
  row: DbHelper,
) {
  public val methodId: Int = row.int("dbcol.fishing_method:method_id")

  public val tool: String? = row.stringOptional("dbcol.fishing_method:tool")

  public val bait: String? = row.stringOptional("dbcol.fishing_method:bait")

  public val anim: String = row.string("dbcol.fishing_method:anim")

  public val article: String = row.string("dbcol.fishing_method:article")

  public val msg: String = row.string("dbcol.fishing_method:msg")

  public val altTool: String? = row.stringOptional("dbcol.fishing_method:alt_tool")

  public val fallback: Int = row.int("dbcol.fishing_method:fallback")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FishingMethodRow> by
        lazy { DbHelper.table("dbtable.fishing_method").map { FishingMethodRow(it) } }

    public fun all(): List<FishingMethodRow> = cachedAll

    public fun getRow(row: Int): FishingMethodRow = FishingMethodRow(DbHelper.row(row))

    public fun getRow(column: String): FishingMethodRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
