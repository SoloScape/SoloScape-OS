// AUTO-GENERATED for dbtable.fairyring — do not edit.
package org.rsmod.api.table

import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.NpcServerType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.MapElementIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.component
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.npcOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class FairyringRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.fairyring:id")

  public val multilocState: Int = row.int("dbcol.fairyring:multiloc_state")

  public val destCoord: CoordGrid = row.coord("dbcol.fairyring:dest_coord")

  public val code: String = row.string("dbcol.fairyring:code")

  public val textComponent: ComponentType = row.component("dbcol.fairyring:text_component")

  public val faveIconComponent: ComponentType = row.component("dbcol.fairyring:fave_icon_component")

  public val mapelement: Int = row.column("dbcol.fairyring:mapelement", MapElementIdCodec)

  public val mapelementTooltip: String = row.string("dbcol.fairyring:mapelement_tooltip")

  public val desc: String? = row.stringOptional("dbcol.fairyring:desc")

  public val apparitionNpc: NpcServerType? = row.npcOptional("dbcol.fairyring:apparition_npc")

  public val showApparition: Boolean? = row.booleanOptional("dbcol.fairyring:show_apparition")

  public val noStaffReturn: Boolean? = row.booleanOptional("dbcol.fairyring:no_staff_return")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<FairyringRow> by
        lazy { DbHelper.table("dbtable.fairyring").map { FairyringRow(it) } }

    public fun all(): List<FairyringRow> = cachedAll

    public fun getRow(row: Int): FairyringRow = FairyringRow(DbHelper.row(row))

    public fun getRow(column: String): FairyringRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
