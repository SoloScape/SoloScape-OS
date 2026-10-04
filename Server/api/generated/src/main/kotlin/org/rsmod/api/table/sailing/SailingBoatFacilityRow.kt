// AUTO-GENERATED for dbtable.sailing_boat_facility — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.definition.type.DBRowType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.SequenceServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.GraphicIdCodec
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.slotsOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.sailing.SailingBoatFacilityRow
import org.rsmod.api.table.sailing.SailingBoatFacilityStatsRow
import org.rsmod.api.table.sailing.SailingCombatFacilityRow
import org.rsmod.api.table.sailing.SailingCustomisationLocAnglesRow
import org.rsmod.api.table.sailing.SailingSidepanelFacilityRow
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2
import org.rsmod.api.table.toTuple3

public class SailingBoatFacilityRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.sailing_boat_facility:name")

  public val description: String = row.string("dbcol.sailing_boat_facility:description")

  public val customisationHideDesc: Boolean? =
      row.booleanOptional("dbcol.sailing_boat_facility:customisation_hide_desc")

  public val facilityType: Int? = row.intOptional("dbcol.sailing_boat_facility:facility_type")

  public val facilitySubtype: Int? = row.intOptional("dbcol.sailing_boat_facility:facility_subtype")

  public val facilityTypeSprite: Tuple3<Int?, Int?, Int?>? =
      row.multiColumnMixedOptional("dbcol.sailing_boat_facility:facility_type_sprite", GraphicIdCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toTuple3()

  public val loc: List<ObjectServerType> =
      row.list("dbcol.sailing_boat_facility:loc", DbColumnCodec.LocTypeCodec)

  public val alternateLocs: ObjectServerType? =
      row.columnOptional("dbcol.sailing_boat_facility:alternate_locs", DbColumnCodec.LocTypeCodec)

  public val customisationLocValues: SailingCustomisationLocAnglesRow by
      lazy { SailingCustomisationLocAnglesRow.getRow(row.dbRow("dbcol.sailing_boat_facility:customisation_loc_values").id) }

  public val customisationLocOverride: ObjectServerType? =
      row.columnOptional("dbcol.sailing_boat_facility:customisation_loc_override", DbColumnCodec.LocTypeCodec)

  public val customisationLocAnim: SequenceServerType? =
      row.columnOptional("dbcol.sailing_boat_facility:customisation_loc_anim", DbColumnCodec.SeqCodec)

  public val hiddenModel: Int? =
      row.columnOptional("dbcol.sailing_boat_facility:hidden_model", ModelIdCodec)

  public val sailingRequirement: Int = row.int("dbcol.sailing_boat_facility:sailing_requirement")

  public val constructionRequirement: Int =
      row.int("dbcol.sailing_boat_facility:construction_requirement")

  public val constructionCoinsAlternative: Boolean? =
      row.booleanOptional("dbcol.sailing_boat_facility:construction_coins_alternative")

  public val otherStatRequirement: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.sailing_boat_facility:other_stat_requirement", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val questRequirement: DBRowType? =
      row.columnOptional("dbcol.sailing_boat_facility:quest_requirement", DbColumnCodec.DbRowTypeCodec)

  public val material: List<Tuple2<ItemServerType, Int>> =
      row.multiColumnMixed("dbcol.sailing_boat_facility:material", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val buildMax: Int? = row.intOptional("dbcol.sailing_boat_facility:build_max")

  public val variants: List<SailingBoatFacilityRow> by
      lazy { row.slotsOptional("dbcol.sailing_boat_facility:variants", DbColumnCodec.DbRowTypeCodec).map { SailingBoatFacilityRow.getRow(it.id) } }

  public val facilityStats: SailingBoatFacilityStatsRow? by
      lazy { row.columnOptional("dbcol.sailing_boat_facility:facility_stats", DbColumnCodec.DbRowTypeCodec)?.let { SailingBoatFacilityStatsRow.getRow(it.id) } }

  public val sidepanelLayoutData: SailingSidepanelFacilityRow? by
      lazy { row.columnOptional("dbcol.sailing_boat_facility:sidepanel_layout_data", DbColumnCodec.DbRowTypeCodec)?.let { SailingSidepanelFacilityRow.getRow(it.id) } }

  public val crewFacility: Int = row.int("dbcol.sailing_boat_facility:crew_facility")

  public val crewStatRequirement: List<Int> =
      row.slotsOptional("dbcol.sailing_boat_facility:crew_stat_requirement", DbColumnCodec.IntCodec, DbColumnCodec.IntCodec)

  public val combatFacilityData: SailingCombatFacilityRow? by
      lazy { row.columnOptional("dbcol.sailing_boat_facility:combat_facility_data", DbColumnCodec.DbRowTypeCodec)?.let { SailingCombatFacilityRow.getRow(it.id) } }

  public val facilityCustomisationOrder: Int? =
      row.intOptional("dbcol.sailing_boat_facility:facility_customisation_order")

  public val facilityBottleId: Int? =
      row.intOptional("dbcol.sailing_boat_facility:facility_bottle_id")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatFacilityRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_facility").map { SailingBoatFacilityRow(it) } }

    public fun all(): List<SailingBoatFacilityRow> = cachedAll

    public fun getRow(row: Int): SailingBoatFacilityRow = SailingBoatFacilityRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatFacilityRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
