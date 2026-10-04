// AUTO-GENERATED for dbtable.hair_styles — do not edit.
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

public class HairStylesRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.hair_styles:name")

  public val playerKitIdTypeA: Int =
      row.column("dbcol.hair_styles:player_kit_id_type_a", IdkIdCodec)

  public val playerKitIdTypeB: Int =
      row.column("dbcol.hair_styles:player_kit_id_type_b", IdkIdCodec)

  public val headModel: Int = row.column("dbcol.hair_styles:head_model", ModelIdCodec)

  public val updoVariantTypeA: Int? =
      row.columnOptional("dbcol.hair_styles:updo_variant_type_a", IdkIdCodec)

  public val updoVariantTypeB: Int? =
      row.columnOptional("dbcol.hair_styles:updo_variant_type_b", IdkIdCodec)

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<HairStylesRow> by
        lazy { DbHelper.table("dbtable.hair_styles").map { HairStylesRow(it) } }

    public fun all(): List<HairStylesRow> = cachedAll

    public fun getRow(row: Int): HairStylesRow = HairStylesRow(DbHelper.row(row))

    public fun getRow(column: String): HairStylesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
