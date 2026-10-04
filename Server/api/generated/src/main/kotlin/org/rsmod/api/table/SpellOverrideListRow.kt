// AUTO-GENERATED for dbtable.spell_override_list — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.list
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.SpellOverrideRow

public class SpellOverrideListRow(
  row: DbHelper,
) {
  public val `override`: List<SpellOverrideRow> by
      lazy { row.list("dbcol.spell_override_list:override", DbColumnCodec.DbRowTypeCodec).map { SpellOverrideRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SpellOverrideListRow> by
        lazy { DbHelper.table("dbtable.spell_override_list").map { SpellOverrideListRow(it) } }

    public fun all(): List<SpellOverrideListRow> = cachedAll

    public fun getRow(row: Int): SpellOverrideListRow = SpellOverrideListRow(DbHelper.row(row))

    public fun getRow(column: String): SpellOverrideListRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
