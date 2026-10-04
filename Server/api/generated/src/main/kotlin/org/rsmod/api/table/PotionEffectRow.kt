// AUTO-GENERATED for dbtable.potion_effect — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.PotionEffectRow

public class PotionEffectRow(
  row: DbHelper,
) {
  public val key: String = row.string("dbcol.potion_effect:key")

  public val kind: String = row.string("dbcol.potion_effect:kind")

  public val skills: List<StatType> =
      row.slotsOptional("dbcol.potion_effect:skills", DbColumnCodec.StatTypeCodec)

  public val base: Int = row.int("dbcol.potion_effect:base")

  public val percent: Int = row.int("dbcol.potion_effect:percent")

  public val amount: Int = row.int("dbcol.potion_effect:amount")

  public val effects: List<PotionEffectRow> by
      lazy { row.slotsOptional("dbcol.potion_effect:effects", DbColumnCodec.DbRowTypeCodec).map { PotionEffectRow.getRow(it.id) } }

  public val excludedSkills: List<StatType> =
      row.slotsOptional("dbcol.potion_effect:excluded_skills", DbColumnCodec.StatTypeCodec)

  public val restorePrayer: Boolean = row.boolean("dbcol.potion_effect:restore_prayer")

  public val stamina: Boolean = row.boolean("dbcol.potion_effect:stamina")

  public val duration: Int = row.int("dbcol.potion_effect:duration")

  public val poisonImmunity: Int = row.int("dbcol.potion_effect:poison_immunity")

  public val venomImmunity: Int = row.int("dbcol.potion_effect:venom_immunity")

  public val fullProtection: Boolean = row.boolean("dbcol.potion_effect:full_protection")

  public val curesDisease: Boolean = row.boolean("dbcol.potion_effect:cures_disease")

  public val handler: String = row.string("dbcol.potion_effect:handler")

  public val baseEffect: PotionEffectRow? by
      lazy { row.columnOptional("dbcol.potion_effect:base_effect", DbColumnCodec.DbRowTypeCodec)?.let { PotionEffectRow.getRow(it.id) } }

  public val damage: Int = row.int("dbcol.potion_effect:damage")

  public val variant: String = row.string("dbcol.potion_effect:variant")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PotionEffectRow> by
        lazy { DbHelper.table("dbtable.potion_effect").map { PotionEffectRow(it) } }

    public fun all(): List<PotionEffectRow> = cachedAll

    public fun getRow(row: Int): PotionEffectRow = PotionEffectRow(DbHelper.row(row))

    public fun getRow(column: String): PotionEffectRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
