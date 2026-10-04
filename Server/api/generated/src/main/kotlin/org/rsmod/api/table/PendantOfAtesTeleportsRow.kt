// AUTO-GENERATED for dbtable.pendant_of_ates_teleports — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.component
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class PendantOfAtesTeleportsRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.pendant_of_ates_teleports:id")

  public val teleportName: String = row.string("dbcol.pendant_of_ates_teleports:teleport_name")

  public val teleportCoord: CoordGrid = row.coord("dbcol.pendant_of_ates_teleports:teleport_coord")

  public val teleportIfLayer: ComponentType =
      row.component("dbcol.pendant_of_ates_teleports:teleport_if_layer")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PendantOfAtesTeleportsRow> by
        lazy { DbHelper.table("dbtable.pendant_of_ates_teleports").map { PendantOfAtesTeleportsRow(it) } }

    public fun all(): List<PendantOfAtesTeleportsRow> = cachedAll

    public fun getRow(row: Int): PendantOfAtesTeleportsRow = PendantOfAtesTeleportsRow(DbHelper.row(row))

    public fun getRow(column: String): PendantOfAtesTeleportsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
