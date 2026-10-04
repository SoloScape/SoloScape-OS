// AUTO-GENERATED for dbtable.sailing_boat_keel — do not edit.
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
import org.rsmod.api.table.Tuple4
import org.rsmod.api.table.sailing.SailingBoatFacilityStatsRow
import org.rsmod.api.table.sailing.SailingCustomisationLocAnglesRow
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toListOfTuple4
import org.rsmod.api.table.toTuple2
import org.rsmod.api.table.toTuple4
import org.rsmod.map.CoordGrid

public class SailingBoatKeelRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.sailing_boat_keel:name")

  public val description: String = row.string("dbcol.sailing_boat_keel:description")

  public val customisationHideDesc: Boolean? =
      row.booleanOptional("dbcol.sailing_boat_keel:customisation_hide_desc")

  public val loc: List<Tuple4<CoordGrid, ObjectServerType, Int, Int>> =
      row.multiColumnMixed("dbcol.sailing_boat_keel:loc", DbColumnCodec.CoordGridCodec, DbColumnCodec.LocTypeCodec, DbColumnCodec.IntCodec, LocShapeIdCodec).toListOfTuple4()

  public val customisationLocValues: SailingCustomisationLocAnglesRow by
      lazy { SailingCustomisationLocAnglesRow.getRow(row.dbRow("dbcol.sailing_boat_keel:customisation_loc_values").id) }

  public val customisationLocOverride: ObjectServerType? =
      row.columnOptional("dbcol.sailing_boat_keel:customisation_loc_override", DbColumnCodec.LocTypeCodec)

  public val sailingRequirement: Int = row.int("dbcol.sailing_boat_keel:sailing_requirement")

  public val constructionRequirement: Int =
      row.int("dbcol.sailing_boat_keel:construction_requirement")

  public val constructionCoinsAlternative: Boolean? =
      row.booleanOptional("dbcol.sailing_boat_keel:construction_coins_alternative")

  public val otherStatRequirement: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.sailing_boat_keel:other_stat_requirement", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val questRequirement: DBRowType? =
      row.columnOptional("dbcol.sailing_boat_keel:quest_requirement", DbColumnCodec.DbRowTypeCodec)

  public val material: List<Tuple2<ItemServerType, Int>> =
      row.multiColumnMixedOptional("dbcol.sailing_boat_keel:material", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val facilityStats: SailingBoatFacilityStatsRow by
      lazy { SailingBoatFacilityStatsRow.getRow(row.dbRow("dbcol.sailing_boat_keel:facility_stats").id) }

  public val facilityCustomisationOrder: Int? =
      row.intOptional("dbcol.sailing_boat_keel:facility_customisation_order")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatKeelRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_keel").map { SailingBoatKeelRow(it) } }

    public fun all(): List<SailingBoatKeelRow> = cachedAll

    public fun getRow(row: Int): SailingBoatKeelRow = SailingBoatKeelRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatKeelRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
