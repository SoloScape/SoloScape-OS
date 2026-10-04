// AUTO-GENERATED for dbtable.poll_filters — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class PollFiltersRow(
  row: DbHelper,
) {
  public val category: Boolean = row.boolean("dbcol.poll_filters:category")

  public val id: Int = row.int("dbcol.poll_filters:id")

  public val opbase: String = row.string("dbcol.poll_filters:opbase")

  public val icon: Int = row.column("dbcol.poll_filters:icon", GraphicIdCodec)

  public val desc: String? = row.stringOptional("dbcol.poll_filters:desc")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PollFiltersRow> by
        lazy { DbHelper.table("dbtable.poll_filters").map { PollFiltersRow(it) } }

    public fun all(): List<PollFiltersRow> = cachedAll

    public fun getRow(row: Int): PollFiltersRow = PollFiltersRow(DbHelper.row(row))

    public fun getRow(column: String): PollFiltersRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
