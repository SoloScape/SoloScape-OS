// AUTO-GENERATED for dbtable.slayer_modifiers — do not edit.
package org.rsmod.api.table.slayer

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SlayerModifiersRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.slayer_modifiers:id")

  public val name: String = row.string("dbcol.slayer_modifiers:name")

  public val description: String = row.string("dbcol.slayer_modifiers:description")

  public val requirement: Int = row.int("dbcol.slayer_modifiers:requirement")

  public val sprite: Int? = row.columnOptional("dbcol.slayer_modifiers:sprite", GraphicIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SlayerModifiersRow> by
        lazy { DbHelper.table("dbtable.slayer_modifiers").map { SlayerModifiersRow(it) } }

    public fun all(): List<SlayerModifiersRow> = cachedAll

    public fun getRow(row: Int): SlayerModifiersRow = SlayerModifiersRow(DbHelper.row(row))

    public fun getRow(column: String): SlayerModifiersRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
