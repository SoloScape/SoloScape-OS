// AUTO-GENERATED for dbtable.settings_configs — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.VarpIdCodec
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.SettingsConfigsRow

public class SettingsConfigsRow(
  row: DbHelper,
) {
  public val settingId: Int = row.int("dbcol.settings_configs:setting_id")

  public val varp: Int? = row.columnOptional("dbcol.settings_configs:varp", VarpIdCodec)

  public val varbit: Int? = row.intOptional("dbcol.settings_configs:varbit")

  public val default: Int? = row.intOptional("dbcol.settings_configs:default")

  public val dropdownEnum: Int? = row.intOptional("dbcol.settings_configs:dropdown_enum")

  public val min: Int? = row.intOptional("dbcol.settings_configs:min")

  public val max: Int? = row.intOptional("dbcol.settings_configs:max")

  public val prompt: String? = row.stringOptional("dbcol.settings_configs:prompt")

  public val enableToggle: SettingsConfigsRow? by
      lazy { row.columnOptional("dbcol.settings_configs:enable_toggle", DbColumnCodec.DbRowTypeCodec)?.let { SettingsConfigsRow.getRow(it.id) } }

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SettingsConfigsRow> by
        lazy { DbHelper.table("dbtable.settings_configs").map { SettingsConfigsRow(it) } }

    public fun all(): List<SettingsConfigsRow> = cachedAll

    public fun getRow(row: Int): SettingsConfigsRow = SettingsConfigsRow(DbHelper.row(row))

    public fun getRow(column: String): SettingsConfigsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
