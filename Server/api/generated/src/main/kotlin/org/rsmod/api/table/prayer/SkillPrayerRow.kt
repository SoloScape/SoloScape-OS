// AUTO-GENERATED for dbtable.skill_prayer — do not edit.
package org.rsmod.api.table.prayer

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.boolean
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.obj
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SkillPrayerRow(
  row: DbHelper,
) {
  public val item: ItemServerType = row.obj("dbcol.skill_prayer:item")

  public val exp: Int = row.int("dbcol.skill_prayer:exp")

  public val ashes: Boolean = row.boolean("dbcol.skill_prayer:ashes")

  public val prayerRestore: Int = row.int("dbcol.skill_prayer:prayer_restore")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SkillPrayerRow> by
        lazy { DbHelper.table("dbtable.skill_prayer").map { SkillPrayerRow(it) } }

    public fun all(): List<SkillPrayerRow> = cachedAll

    public fun getRow(row: Int): SkillPrayerRow = SkillPrayerRow(DbHelper.row(row))

    public fun getRow(column: String): SkillPrayerRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
