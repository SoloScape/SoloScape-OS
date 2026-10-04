// AUTO-GENERATED for dbtable.pet_skilling — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.enumTypeId
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.stat
import dev.openrune.types.enums.EnumTypeMap
import dev.openrune.types.enums.`enum`
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class PetSkillingRow(
  row: DbHelper,
) {
  public val skill: StatType = row.stat("dbcol.pet_skilling:skill")

  public val pet: ItemServerType = row.obj("dbcol.pet_skilling:pet")

  public val base: Int = row.int("dbcol.pet_skilling:base")

  public val chances: EnumTypeMap<ItemServerType, Int> =
      enum(row.enumTypeId("dbcol.pet_skilling:chances"))

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PetSkillingRow> by
        lazy { DbHelper.table("dbtable.pet_skilling").map { PetSkillingRow(it) } }

    public fun all(): List<PetSkillingRow> = cachedAll

    public fun getRow(row: Int): PetSkillingRow = PetSkillingRow(DbHelper.row(row))

    public fun getRow(column: String): PetSkillingRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
