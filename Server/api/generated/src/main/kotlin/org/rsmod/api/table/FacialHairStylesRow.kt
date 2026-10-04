// AUTO-GENERATED for dbtable.facial_hair_styles — do not edit.
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

public class FacialHairStylesRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.facial_hair_styles:name")

  public val playerKitIdTypeA: Int =
      row.column("dbcol.facial_hair_styles:player_kit_id_type_a", IdkIdCodec)

  public val playerKitIdTypeB: Int =
      row.column("dbcol.facial_hair_styles:player_kit_id_type_b", IdkIdCodec)

  public val chatHead: Int = row.column("dbcol.facial_hair_styles:chat_head", ModelIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FacialHairStylesRow> by
        lazy { DbHelper.table("dbtable.facial_hair_styles").map { FacialHairStylesRow(it) } }

    public fun all(): List<FacialHairStylesRow> = cachedAll

    public fun getRow(row: Int): FacialHairStylesRow = FacialHairStylesRow(DbHelper.row(row))

    public fun getRow(column: String): FacialHairStylesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
