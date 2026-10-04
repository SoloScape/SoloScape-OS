// AUTO-GENERATED for dbtable.sailing_boat_sail — do not edit.
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
import dev.openrune.types.dbcol.LocShapeIdCodec
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.Tuple5
import org.rsmod.api.table.sailing.SailingBoatFacilityStatsRow
import org.rsmod.api.table.sailing.SailingCustomisationLocAnglesRow
import org.rsmod.api.table.sailing.SailingSidepanelFacilityRow
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toListOfTuple5
import org.rsmod.api.table.toTuple2
import org.rsmod.api.table.toTuple5
import org.rsmod.map.CoordGrid

public class SailingBoatSailRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.sailing_boat_sail:name")

  public val description: String = row.string("dbcol.sailing_boat_sail:description")

  public val customisationHideDesc: Boolean? =
      row.booleanOptional("dbcol.sailing_boat_sail:customisation_hide_desc")

  public val customisationLocValues: SailingCustomisationLocAnglesRow by
      lazy { SailingCustomisationLocAnglesRow.getRow(row.dbRow("dbcol.sailing_boat_sail:customisation_loc_values").id) }

  public val customisationLocOverride: ObjectServerType? =
      row.columnOptional("dbcol.sailing_boat_sail:customisation_loc_override", DbColumnCodec.LocTypeCodec)

  public val hiddenModel: Int? =
      row.columnOptional("dbcol.sailing_boat_sail:hidden_model", ModelIdCodec)

  public val sailingRequirement: Int = row.int("dbcol.sailing_boat_sail:sailing_requirement")

  public val constructionRequirement: Int =
      row.int("dbcol.sailing_boat_sail:construction_requirement")

  public val constructionCoinsAlternative: Boolean? =
      row.booleanOptional("dbcol.sailing_boat_sail:construction_coins_alternative")

  public val otherStatRequirement: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.sailing_boat_sail:other_stat_requirement", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val questRequirement: DBRowType? =
      row.columnOptional("dbcol.sailing_boat_sail:quest_requirement", DbColumnCodec.DbRowTypeCodec)

  public val material: List<Tuple2<ItemServerType, Int>> =
      row.multiColumnMixedOptional("dbcol.sailing_boat_sail:material", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val loc: List<Tuple5<ObjectServerType, CoordGrid, Int, Int, DBRowType>> =
      row.multiColumnMixed("dbcol.sailing_boat_sail:loc", DbColumnCodec.LocTypeCodec, DbColumnCodec.CoordGridCodec, DbColumnCodec.IntCodec, LocShapeIdCodec, DbColumnCodec.DbRowTypeCodec).toListOfTuple5()

  public val facilityStats: SailingBoatFacilityStatsRow by
      lazy { SailingBoatFacilityStatsRow.getRow(row.dbRow("dbcol.sailing_boat_sail:facility_stats").id) }

  public val sidepanelLayoutData: SailingSidepanelFacilityRow by
      lazy { SailingSidepanelFacilityRow.getRow(row.dbRow("dbcol.sailing_boat_sail:sidepanel_layout_data").id) }

  public val facilityCustomisationOrder: Int? =
      row.intOptional("dbcol.sailing_boat_sail:facility_customisation_order")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatSailRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_sail").map { SailingBoatSailRow(it) } }

    public fun all(): List<SailingBoatSailRow> = cachedAll

    public fun getRow(row: Int): SailingBoatSailRow = SailingBoatSailRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatSailRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
