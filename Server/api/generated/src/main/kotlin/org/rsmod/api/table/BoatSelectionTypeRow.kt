// AUTO-GENERATED for dbtable.boat_selection_type — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class BoatSelectionTypeRow(
  row: DbHelper,
) {
  public val type: Int = row.int("dbcol.boat_selection_type:type")

  public val title: String = row.string("dbcol.boat_selection_type:title")

  public val selectionText: String? = row.stringOptional("dbcol.boat_selection_type:selection_text")

  public val selectionEnabled: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:selection_enabled")

  public val showRecentBoat: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:show_recent_boat")

  public val showRetrievalCost: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:show_retrieval_cost")

  public val showBoatHealth: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:show_boat_health")

  public val showEmptyBoatSlots: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:show_empty_boat_slots")

  public val showCargoHold: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:show_cargo_hold")

  public val bottledShipsNotAllowed: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:bottled_ships_not_allowed")

  public val capsizedShipsNotAllowed: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:capsized_ships_not_allowed")

  public val lostShipsNotAllowed: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:lost_ships_not_allowed")

  public val onlyBoatsAtCurrentPort: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:only_boats_at_current_port")

  public val requiresTeleportFocus: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:requires_teleport_focus")

  public val requiresGreaterTeleportFocus: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:requires_greater_teleport_focus")

  public val requiresEmptyCargoHold: Boolean? =
      row.booleanOptional("dbcol.boat_selection_type:requires_empty_cargo_hold")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<BoatSelectionTypeRow> by
        lazy { DbHelper.table("dbtable.boat_selection_type").map { BoatSelectionTypeRow(it) } }

    public fun all(): List<BoatSelectionTypeRow> = cachedAll

    public fun getRow(row: Int): BoatSelectionTypeRow = BoatSelectionTypeRow(DbHelper.row(row))

    public fun getRow(column: String): BoatSelectionTypeRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
