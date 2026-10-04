// AUTO-GENERATED for dbtable.sailing_boat_brazier — do not edit.
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
import dev.openrune.types.dbcol.LocShapeIdCodec
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.multiColumnMixed
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.Tuple3
import org.rsmod.api.table.Tuple4
import org.rsmod.api.table.sailing.SailingBoatFacilityStatsRow
import org.rsmod.api.table.sailing.SailingCustomisationLocAnglesRow
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toListOfTuple4
import org.rsmod.api.table.toTuple2
import org.rsmod.api.table.toTuple3
import org.rsmod.api.table.toTuple4
import org.rsmod.map.CoordGrid

public class SailingBoatBrazierRow(
  row: DbHelper,
) {
  public val name: String = row.string("dbcol.sailing_boat_brazier:name")

  public val description: String = row.string("dbcol.sailing_boat_brazier:description")

  public val customisationLocValues: SailingCustomisationLocAnglesRow by
      lazy { SailingCustomisationLocAnglesRow.getRow(row.dbRow("dbcol.sailing_boat_brazier:customisation_loc_values").id) }

  public val customisationLocOverride: ObjectServerType =
      row.loc("dbcol.sailing_boat_brazier:customisation_loc_override")

  public val customisationLocAnim: SequenceServerType? =
      row.columnOptional("dbcol.sailing_boat_brazier:customisation_loc_anim", DbColumnCodec.SeqCodec)

  public val hiddenModel: Int? =
      row.columnOptional("dbcol.sailing_boat_brazier:hidden_model", ModelIdCodec)

  public val loc: List<Tuple4<CoordGrid, ObjectServerType, Int, Int>> =
      row.multiColumnMixed("dbcol.sailing_boat_brazier:loc", DbColumnCodec.CoordGridCodec, DbColumnCodec.LocTypeCodec, DbColumnCodec.IntCodec, LocShapeIdCodec).toListOfTuple4()

  public val sailingRequirement: Int = row.int("dbcol.sailing_boat_brazier:sailing_requirement")

  public val constructionRequirement: Int =
      row.int("dbcol.sailing_boat_brazier:construction_requirement")

  public val constructionCoinsAlternative: Boolean? =
      row.booleanOptional("dbcol.sailing_boat_brazier:construction_coins_alternative")

  public val otherStatRequirement: Tuple2<StatType?, Int?>? =
      row.multiColumnMixedOptional("dbcol.sailing_boat_brazier:other_stat_requirement", DbColumnCodec.StatTypeCodec, DbColumnCodec.IntCodec).toTuple2()

  public val questRequirement: DBRowType? =
      row.columnOptional("dbcol.sailing_boat_brazier:quest_requirement", DbColumnCodec.DbRowTypeCodec)

  public val material: List<Tuple2<ItemServerType, Int>> =
      row.multiColumnMixed("dbcol.sailing_boat_brazier:material", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val facilityStats: SailingBoatFacilityStatsRow by
      lazy { SailingBoatFacilityStatsRow.getRow(row.dbRow("dbcol.sailing_boat_brazier:facility_stats").id) }

  public val facilityTypeSprite: Tuple3<Int?, Int?, Int?>? =
      row.multiColumnMixedOptional("dbcol.sailing_boat_brazier:facility_type_sprite", GraphicIdCodec, DbColumnCodec.IntCodec, DbColumnCodec.IntCodec).toTuple3()

  public val facilityCustomisationOrder: Int? =
      row.intOptional("dbcol.sailing_boat_brazier:facility_customisation_order")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<SailingBoatBrazierRow> by
        lazy { DbHelper.table("dbtable.sailing_boat_brazier").map { SailingBoatBrazierRow(it) } }

    public fun all(): List<SailingBoatBrazierRow> = cachedAll

    public fun getRow(row: Int): SailingBoatBrazierRow = SailingBoatBrazierRow(DbHelper.row(row))

    public fun getRow(column: String): SailingBoatBrazierRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
