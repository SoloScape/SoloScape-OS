// AUTO-GENERATED for dbtable.clan_setting_options_list — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.toListOfTuple3
import org.rsmod.api.table.toTuple3

public class ClanSettingOptionsListRow(
  row: DbHelper,
) {
  public val clanSettingTitle: String =
      row.string("dbcol.clan_setting_options_list:clan_setting_title")

  public val clanSettingOption: List<Tuple3<Int, String, Int>> =
      row.multiColumnMixed("dbcol.clan_setting_options_list:clan_setting_option", DbColumnCodec.IntCodec, DbColumnCodec.StringCodec, GraphicIdCodec).toListOfTuple3()

  public val clanSettingEntryHeight: Int =
      row.int("dbcol.clan_setting_options_list:clan_setting_entry_height")

  public val clanSettingMobileEntryHeight: Int? =
      row.intOptional("dbcol.clan_setting_options_list:clan_setting_mobile_entry_height")

  public val clanSettingIconSize: Int =
      row.int("dbcol.clan_setting_options_list:clan_setting_icon_size")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<ClanSettingOptionsListRow> by
        lazy { DbHelper.table("dbtable.clan_setting_options_list").map { ClanSettingOptionsListRow(it) } }

    public fun all(): List<ClanSettingOptionsListRow> = cachedAll

    public fun getRow(row: Int): ClanSettingOptionsListRow = ClanSettingOptionsListRow(DbHelper.row(row))

    public fun getRow(column: String): ClanSettingOptionsListRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
