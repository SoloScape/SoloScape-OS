// AUTO-GENERATED for dbtable.agility_shortcut_link — do not edit.
package org.rsmod.api.table.agility

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.agility.AgilityShortcutRow
import org.rsmod.api.table.toListOfTuple3
import org.rsmod.api.table.toTuple3
import org.rsmod.map.CoordGrid

public class AgilityShortcutLinkRow(
  row: DbHelper,
) {
  public val shortcut: AgilityShortcutRow by
      lazy { AgilityShortcutRow.getRow(row.dbRow("dbcol.agility_shortcut_link:shortcut").id) }

  public val origin: CoordGrid = row.coord("dbcol.agility_shortcut_link:origin")

  public val dest: CoordGrid = row.coord("dbcol.agility_shortcut_link:dest")

  public val level: Int = row.int("dbcol.agility_shortcut_link:level")

  public val ranged: Int? = row.intOptional("dbcol.agility_shortcut_link:ranged")

  public val strength: Int? = row.intOptional("dbcol.agility_shortcut_link:strength")

  public val gear: Int? = row.intOptional("dbcol.agility_shortcut_link:gear")

  public val quest: String? = row.stringOptional("dbcol.agility_shortcut_link:quest")

  public val varGate: List<Tuple3<String, Int, Int>> =
      row.multiColumnMixedOptional("dbcol.agility_shortcut_link:var_gate", DbColumnCodec.StringCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toListOfTuple3()

  public val bareLevel: Int? = row.intOptional("dbcol.agility_shortcut_link:bare_level")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<AgilityShortcutLinkRow> by
        lazy { DbHelper.table("dbtable.agility_shortcut_link").map { AgilityShortcutLinkRow(it) } }

    public fun all(): List<AgilityShortcutLinkRow> = cachedAll

    public fun getRow(row: Int): AgilityShortcutLinkRow = AgilityShortcutLinkRow(DbHelper.row(row))

    public fun getRow(column: String): AgilityShortcutLinkRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
