// AUTO-GENERATED for dbtable.pet_morphs — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class PetMorphsRow(
  row: DbHelper,
) {
  public val pet: String = row.string("dbcol.pet_morphs:pet")

  public val item: ItemServerType = row.obj("dbcol.pet_morphs:item")

  public val form: ItemServerType? = row.objOptional("dbcol.pet_morphs:form")

  public val unlocks: List<Int> =
      row.slotsOptional("dbcol.pet_morphs:unlocks", DbColumnCodec.IntCodec)

  public val requires: Int? = row.intOptional("dbcol.pet_morphs:requires")

  public val count: Int = row.int("dbcol.pet_morphs:count")

  public val consume: Boolean = row.boolean("dbcol.pet_morphs:consume")

  public val held: Boolean = row.boolean("dbcol.pet_morphs:held")

  public val label: String? = row.stringOptional("dbcol.pet_morphs:label")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PetMorphsRow> by
        lazy { DbHelper.table("dbtable.pet_morphs").map { PetMorphsRow(it) } }

    public fun all(): List<PetMorphsRow> = cachedAll

    public fun getRow(row: Int): PetMorphsRow = PetMorphsRow(DbHelper.row(row))

    public fun getRow(column: String): PetMorphsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
