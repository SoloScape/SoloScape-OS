// AUTO-GENERATED for dbtable.didyouknow — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class DidyouknowRow(
  row: DbHelper,
) {
  public val istip: Boolean? = row.booleanOptional("dbcol.didyouknow:istip")

  public val tip: String = row.string("dbcol.didyouknow:tip")

  public val membersonly: Boolean? = row.booleanOptional("dbcol.didyouknow:membersonly")

  public val onmobile: Boolean? = row.booleanOptional("dbcol.didyouknow:onmobile")

  public val mobileonly: Boolean? = row.booleanOptional("dbcol.didyouknow:mobileonly")

  public val extrareq: Int? = row.intOptional("dbcol.didyouknow:extrareq")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<DidyouknowRow> by
        lazy { DbHelper.table("dbtable.didyouknow").map { DidyouknowRow(it) } }

    public fun all(): List<DidyouknowRow> = cachedAll

    public fun getRow(row: Int): DidyouknowRow = DidyouknowRow(DbHelper.row(row))

    public fun getRow(column: String): DidyouknowRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
