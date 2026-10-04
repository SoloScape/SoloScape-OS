// AUTO-GENERATED for dbtable.agility_shortcut — do not edit.
package org.rsmod.api.table.agility

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class AgilityShortcutRow(
  row: DbHelper,
) {
  public val loc: ObjectServerType = row.loc("dbcol.agility_shortcut:loc")

  public val option: String = row.string("dbcol.agility_shortcut:option")

  public val level: Int = row.int("dbcol.agility_shortcut:level")

  public val xp: Int = row.int("dbcol.agility_shortcut:xp")

  public val ticks: Int = row.int("dbcol.agility_shortcut:ticks")

  public val fail: List<Int> =
      row.slotsOptional("dbcol.agility_shortcut:fail", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<AgilityShortcutRow> by
        lazy { DbHelper.table("dbtable.agility_shortcut").map { AgilityShortcutRow(it) } }

    public fun all(): List<AgilityShortcutRow> = cachedAll

    public fun getRow(row: Int): AgilityShortcutRow = AgilityShortcutRow(DbHelper.row(row))

    public fun getRow(column: String): AgilityShortcutRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
