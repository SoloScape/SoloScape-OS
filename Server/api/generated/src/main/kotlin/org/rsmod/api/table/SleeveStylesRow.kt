// AUTO-GENERATED for dbtable.sleeve_styles — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.IdkIdCodec
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SleeveStylesRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.sleeve_styles:name")

  public val playerKitIdTypeA: Int =
      row.column("dbcol.sleeve_styles:player_kit_id_type_a", IdkIdCodec)

  public val playerKitIdTypeB: Int =
      row.column("dbcol.sleeve_styles:player_kit_id_type_b", IdkIdCodec)

  public val sleeveModelTypeA: Int =
      row.column("dbcol.sleeve_styles:sleeve_model_type_a", ModelIdCodec)

  public val sleeveModelTypeB: Int =
      row.column("dbcol.sleeve_styles:sleeve_model_type_b", ModelIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SleeveStylesRow> by
        lazy { DbHelper.table("dbtable.sleeve_styles").map { SleeveStylesRow(it) } }

    public fun all(): List<SleeveStylesRow> = cachedAll

    public fun getRow(row: Int): SleeveStylesRow = SleeveStylesRow(DbHelper.row(row))

    public fun getRow(column: String): SleeveStylesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
