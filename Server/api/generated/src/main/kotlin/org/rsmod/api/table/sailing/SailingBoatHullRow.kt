// AUTO-GENERATED for dbtable.sailing_boat_hull — do not edit.
package org.rsmod.api.table.sailing

import dev.openrune.definition.type.DBRowType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.StatType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.sailing.SailingBoatFacilityStatsRow
import org.rsmod.api.table.sailing.SailingCustomisationLocAnglesRow
import org.rsmod.api.table.sailing.SailingSidepanelFacilityRow
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class SailingBoatHullRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.sailing_boat_hull:name")

  public val description: String = row.string("dbcol.sailing_boat_hull:description")

  public val customisationHideDesc: Boolean? =
      row.booleanOptional("dbcol.sailing_boat_hull:customisation_hide_desc")

  public val loc: ObjectServerType = row.loc("dbcol.sailing_boat_hull:loc")

  public val customisationLocValues: SailingCustomisationLocAnglesRow by
      lazy { SailingCustomisationLocAnglesRow.getRow(row.dbRow("dbcol.sailing_boat_hull:customisation_loc_values").id) }

  public val customisationLocOverride: ObjectServerType? =
      row.columnOptional("dbcol.sailing_boat_hull:customisation_loc_override", DbColumnCodec.LocTypeCodec)

  public val sailingRequirement: Int = row.int("dbcol.sailing_boat_hull:sailing_requirement")

  public val constructionRequirement: Int =
      row.int("dbcol.sailing_boat_hull:construction_requirement")

  public val constructionCoinsAlternative: Boolean? =
      row.booleanOptional("dbcol.sailing_boat_hull:construction_coins_alternative")

  public val otherStatRequirement: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.sailing_boat_hull:other_stat_requirement", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val questRequirement: DBRowType? =
      row.columnOptional("dbcol.sailing_boat_hull:quest_requirement", DbColumnCodec.DbRowTypeCodec)

  public val material: List<Tuple2<ItemServerType, Int>> =
      row.multiColumnMixedOptional("dbcol.sailing_boat_hull:material", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val facilityStats: SailingBoatFacilityStatsRow by
      lazy { SailingBoatFacilityStatsRow.getRow(row.dbRow("dbcol.sailing_boat_hull:facility_stats").id) }

  public val sidepanelLayoutData: SailingSidepanelFacilityRow? by
      lazy { row.columnOptional("dbcol.sailing_boat_hull:sidepanel_layout_data", DbColumnCodec.DbRowTypeCodec)?.let { SailingSidepanelFacilityRow.getRow(it.id) } }

  public val facilityCustomisationOrder: Int? =
      row.intOptional("dbcol.sailing_boat_hull:facility_customisation_order")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatHullRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_hull").map { SailingBoatHullRow(it) } }

    public fun all(): List<SailingBoatHullRow> = cachedAll

    public fun getRow(row: Int): SailingBoatHullRow = SailingBoatHullRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatHullRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
