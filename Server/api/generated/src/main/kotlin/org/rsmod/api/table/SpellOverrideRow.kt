// AUTO-GENERATED for dbtable.spell_override — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.StructIdCodec
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.obj
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SpellOverrideRow(
  row: DbHelper,
) {
  public val baseSpell: ItemServerType = row.obj("dbcol.spell_override:base_spell")

  public val overrideSpell: ItemServerType = row.obj("dbcol.spell_override:override_spell")

  public val relicUnlock: Int? =
      row.columnOptional("dbcol.spell_override:relic_unlock", StructIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SpellOverrideRow> by
        lazy { DbHelper.table("dbtable.spell_override").map { SpellOverrideRow(it) } }

    public fun all(): List<SpellOverrideRow> = cachedAll

    public fun getRow(row: Int): SpellOverrideRow = SpellOverrideRow(DbHelper.row(row))

    public fun getRow(column: String): SpellOverrideRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
