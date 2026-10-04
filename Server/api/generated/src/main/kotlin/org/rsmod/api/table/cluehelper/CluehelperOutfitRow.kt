// AUTO-GENERATED for dbtable.cluehelper_outfit — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CluehelperOutfitRow(
  row: DbHelper,
) {
  public val description: String = row.string("dbcol.cluehelper_outfit:description")

  public val wearposHat: List<ItemServerType> =
      row.slotsOptional("dbcol.cluehelper_outfit:wearpos_hat", DbColumnCodec.ItemServerTypeCodec)

  public val wearposBack: List<ItemServerType> =
      row.slotsOptional("dbcol.cluehelper_outfit:wearpos_back", DbColumnCodec.ItemServerTypeCodec)

  public val wearposFront: List<ItemServerType> =
      row.slotsOptional("dbcol.cluehelper_outfit:wearpos_front", DbColumnCodec.ItemServerTypeCodec)

  public val wearposRhand: List<ItemServerType> =
      row.slotsOptional("dbcol.cluehelper_outfit:wearpos_rhand", DbColumnCodec.ItemServerTypeCodec)

  public val wearposTorso: List<ItemServerType> =
      row.slotsOptional("dbcol.cluehelper_outfit:wearpos_torso", DbColumnCodec.ItemServerTypeCodec)

  public val wearposLhand: List<ItemServerType> =
      row.slotsOptional("dbcol.cluehelper_outfit:wearpos_lhand", DbColumnCodec.ItemServerTypeCodec)

  public val wearposLegs: List<ItemServerType> =
      row.slotsOptional("dbcol.cluehelper_outfit:wearpos_legs", DbColumnCodec.ItemServerTypeCodec)

  public val wearposHands: List<ItemServerType> =
      row.slotsOptional("dbcol.cluehelper_outfit:wearpos_hands", DbColumnCodec.ItemServerTypeCodec)

  public val wearposFeet: ItemServerType? = row.objOptional("dbcol.cluehelper_outfit:wearpos_feet")

  public val wearposRing: List<ItemServerType> =
      row.slotsOptional("dbcol.cluehelper_outfit:wearpos_ring", DbColumnCodec.ItemServerTypeCodec)

  public val wearposQuiver: ItemServerType? =
      row.objOptional("dbcol.cluehelper_outfit:wearpos_quiver")

  public val wearposParamHat: Int? = row.intOptional("dbcol.cluehelper_outfit:wearpos_param_hat")

  public val wearposParamBack: Int? = row.intOptional("dbcol.cluehelper_outfit:wearpos_param_back")

  public val wearposParamFront: Int? =
      row.intOptional("dbcol.cluehelper_outfit:wearpos_param_front")

  public val wearposParamRhand: Int? =
      row.intOptional("dbcol.cluehelper_outfit:wearpos_param_rhand")

  public val wearposParamTorso: Int? =
      row.intOptional("dbcol.cluehelper_outfit:wearpos_param_torso")

  public val wearposParamLhand: Int? =
      row.intOptional("dbcol.cluehelper_outfit:wearpos_param_lhand")

  public val wearposParamLegs: Int? = row.intOptional("dbcol.cluehelper_outfit:wearpos_param_legs")

  public val wearposParamHands: Int? =
      row.intOptional("dbcol.cluehelper_outfit:wearpos_param_hands")

  public val wearposParamFeet: Int? = row.intOptional("dbcol.cluehelper_outfit:wearpos_param_feet")

  public val wearposParamRing: Int? = row.intOptional("dbcol.cluehelper_outfit:wearpos_param_ring")

  public val wearposParamQuiver: Int? =
      row.intOptional("dbcol.cluehelper_outfit:wearpos_param_quiver")

  public val wearposParamAny: Int? = row.intOptional("dbcol.cluehelper_outfit:wearpos_param_any")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperOutfitRow> by
        lazy { DbHelper.table("dbtable.cluehelper_outfit").map { CluehelperOutfitRow(it) } }

    public fun all(): List<CluehelperOutfitRow> = cachedAll

    public fun getRow(row: Int): CluehelperOutfitRow = CluehelperOutfitRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperOutfitRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
