// AUTO-GENERATED for dbtable.puppy_colours — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class PuppyColoursRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.puppy_colours:name")

  public val puppySelection: List<Int> =
      row.list("dbcol.puppy_colours:puppy_selection", ModelIdCodec)

  public val colourNames: List<String> =
      row.list("dbcol.puppy_colours:colour_names", DbColumnCodec.StringCodec)

  public val colourOption: List<Int> =
      row.list("dbcol.puppy_colours:colour_option", DbColumnCodec.IntCodec)

  public val dogModel: Int = row.column("dbcol.puppy_colours:dog_model", ModelIdCodec)

  public val large: Boolean = row.boolean("dbcol.puppy_colours:large")

  public val freeUnlock: Boolean? = row.booleanOptional("dbcol.puppy_colours:free_unlock")

  public val unlockBit: Int? = row.intOptional("dbcol.puppy_colours:unlock_bit")

  public val locationHint: String? = row.stringOptional("dbcol.puppy_colours:location_hint")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PuppyColoursRow> by
        lazy { DbHelper.table("dbtable.puppy_colours").map { PuppyColoursRow(it) } }

    public fun all(): List<PuppyColoursRow> = cachedAll

    public fun getRow(row: Int): PuppyColoursRow = PuppyColoursRow(DbHelper.row(row))

    public fun getRow(column: String): PuppyColoursRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
