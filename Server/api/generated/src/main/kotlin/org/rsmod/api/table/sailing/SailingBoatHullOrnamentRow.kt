// AUTO-GENERATED for dbtable.sailing_boat_hull_ornament — do not edit.
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
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.toTuple2

public class SailingBoatHullOrnamentRow(
  row: DbHelper,
) {
  public val name: String? = row.stringOptional("dbcol.sailing_boat_hull_ornament:name")

  public val description: String? =
      row.stringOptional("dbcol.sailing_boat_hull_ornament:description")

  public val loc: ObjectServerType? =
      row.columnOptional("dbcol.sailing_boat_hull_ornament:loc", DbColumnCodec.LocTypeCodec)

  public val customisationLocValues: DBRowType? =
      row.columnOptional("dbcol.sailing_boat_hull_ornament:customisation_loc_values", DbColumnCodec.DbRowTypeCodec)

  public val customisationLocOverride: ObjectServerType? =
      row.columnOptional("dbcol.sailing_boat_hull_ornament:customisation_loc_override", DbColumnCodec.LocTypeCodec)

  public val hiddenModel: Int? =
      row.columnOptional("dbcol.sailing_boat_hull_ornament:hidden_model", ModelIdCodec)

  public val sailingRequirement: Int? =
      row.intOptional("dbcol.sailing_boat_hull_ornament:sailing_requirement")

  public val constructionRequirement: Int? =
      row.intOptional("dbcol.sailing_boat_hull_ornament:construction_requirement")

  public val constructionCoinsAlternative: Boolean? =
      row.booleanOptional("dbcol.sailing_boat_hull_ornament:construction_coins_alternative")

  public val otherStatRequirement: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.sailing_boat_hull_ornament:other_stat_requirement", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val questRequirement: DBRowType? =
      row.columnOptional("dbcol.sailing_boat_hull_ornament:quest_requirement", DbColumnCodec.DbRowTypeCodec)

  public val material: Tuple2<ItemServerType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.sailing_boat_hull_ornament:material", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val facilityStats: DBRowType? =
      row.columnOptional("dbcol.sailing_boat_hull_ornament:facility_stats", DbColumnCodec.DbRowTypeCodec)

  public val facilityCustomisationOrder: Int? =
      row.intOptional("dbcol.sailing_boat_hull_ornament:facility_customisation_order")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatHullOrnamentRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_hull_ornament").map { SailingBoatHullOrnamentRow(it) } }

    public fun all(): List<SailingBoatHullOrnamentRow> = cachedAll

    public fun getRow(row: Int): SailingBoatHullOrnamentRow = SailingBoatHullOrnamentRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatHullOrnamentRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
