// AUTO-GENERATED for dbtable.butlers_bell_actions — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.stat
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class ButlersBellActionsRow(
  row: DbHelper,
) {
  public val actionId: Int = row.int("dbcol.butlers_bell_actions:action_id")

  public val rawNoun: String = row.string("dbcol.butlers_bell_actions:raw_noun")

  public val processedNoun: String = row.string("dbcol.butlers_bell_actions:processed_noun")

  public val processedXp: Int = row.int("dbcol.butlers_bell_actions:processed_xp")

  public val xpSkill: StatType = row.stat("dbcol.butlers_bell_actions:xp_skill")

  public val gatherBaseRate: Int = row.int("dbcol.butlers_bell_actions:gather_base_rate")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ButlersBellActionsRow> by
        lazy { DbHelper.table("dbtable.butlers_bell_actions").map { ButlersBellActionsRow(it) } }

    public fun all(): List<ButlersBellActionsRow> = cachedAll

    public fun getRow(row: Int): ButlersBellActionsRow = ButlersBellActionsRow(DbHelper.row(row))

    public fun getRow(column: String): ButlersBellActionsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
