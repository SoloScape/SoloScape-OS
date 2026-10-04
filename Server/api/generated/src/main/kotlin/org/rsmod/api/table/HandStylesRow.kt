// AUTO-GENERATED for dbtable.hand_styles — do not edit.
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

public class HandStylesRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.hand_styles:name")

  public val playerKitIdTypeA: Int =
      row.column("dbcol.hand_styles:player_kit_id_type_a", IdkIdCodec)

  public val playerKitIdTypeB: Int =
      row.column("dbcol.hand_styles:player_kit_id_type_b", IdkIdCodec)

  public val handModelTypeA: Int = row.column("dbcol.hand_styles:hand_model_type_a", ModelIdCodec)

  public val handModelTypeB: Int = row.column("dbcol.hand_styles:hand_model_type_b", ModelIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<HandStylesRow> by
        lazy { DbHelper.table("dbtable.hand_styles").map { HandStylesRow(it) } }

    public fun all(): List<HandStylesRow> = cachedAll

    public fun getRow(row: Int): HandStylesRow = HandStylesRow(DbHelper.row(row))

    public fun getRow(column: String): HandStylesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
