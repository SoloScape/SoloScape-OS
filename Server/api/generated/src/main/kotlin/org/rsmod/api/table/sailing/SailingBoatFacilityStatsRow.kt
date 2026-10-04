// AUTO-GENERATED for dbtable.sailing_boat_facility_stats — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.intOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class SailingBoatFacilityStatsRow(
  row: DbHelper,
) {
  public val boatHpMax: Int? = row.intOptional("dbcol.sailing_boat_facility_stats:boat_hp_max")

  public val boatArmour: Int? = row.intOptional("dbcol.sailing_boat_facility_stats:boat_armour")

  public val boatStormresistance: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_stormresistance")

  public val boatRapidresistance: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_rapidresistance")

  public val boatCrystalhelmResistance: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_crystalhelm_resistance")

  public val boatBasespeed: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_basespeed")

  public val boatSpeedcap: Int? = row.intOptional("dbcol.sailing_boat_facility_stats:boat_speedcap")

  public val boatAcceleration: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_acceleration")

  public val boatSpeedboostDuration: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_speedboost_duration")

  public val boatCargoholdSize: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_cargohold_size")

  public val boatFetidWaterResistant: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_fetid_water_resistant")

  public val boatCrystalFleckedResistant: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_crystal_flecked_resistant")

  public val boatTangledKelpResistant: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_tangled_kelp_resistant")

  public val boatIcySeasResistant: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_icy_seas_resistant")

  public val boatMaxWindMotes: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_max_wind_motes")

  public val boatAdditionalRecoveryCostPercentage: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_additional_recovery_cost_percentage")

  public val boatAmmoSavePercentage: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_ammo_save_percentage")

  public val boatAutoRepairRate: Int? =
      row.intOptional("dbcol.sailing_boat_facility_stats:boat_auto_repair_rate")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatFacilityStatsRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_facility_stats").map { SailingBoatFacilityStatsRow(it) } }

    public fun all(): List<SailingBoatFacilityStatsRow> = cachedAll

    public fun getRow(row: Int): SailingBoatFacilityStatsRow = SailingBoatFacilityStatsRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatFacilityStatsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
