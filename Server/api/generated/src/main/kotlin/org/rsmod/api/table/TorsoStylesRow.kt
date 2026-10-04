// AUTO-GENERATED for dbtable.torso_styles — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.IdkIdCodec
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class TorsoStylesRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.torso_styles:name")

  public val playerKitIdTypeA: Int =
      row.column("dbcol.torso_styles:player_kit_id_type_a", IdkIdCodec)

  public val playerKitIdTypeB: Int =
      row.column("dbcol.torso_styles:player_kit_id_type_b", IdkIdCodec)

  public val torsoModelTypeA1: Int =
      row.column("dbcol.torso_styles:torso_model_type_a_1", ModelIdCodec)

  public val torsoModelTypeA2: Int? =
      row.columnOptional("dbcol.torso_styles:torso_model_type_a_2", ModelIdCodec)

  public val torsoModelTypeB1: Int =
      row.column("dbcol.torso_styles:torso_model_type_b_1", ModelIdCodec)

  public val torsoModelTypeB2: Int? =
      row.columnOptional("dbcol.torso_styles:torso_model_type_b_2", ModelIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<TorsoStylesRow> by
        lazy { DbHelper.table("dbtable.torso_styles").map { TorsoStylesRow(it) } }

    public fun all(): List<TorsoStylesRow> = cachedAll

    public fun getRow(row: Int): TorsoStylesRow = TorsoStylesRow(DbHelper.row(row))

    public fun getRow(column: String): TorsoStylesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
