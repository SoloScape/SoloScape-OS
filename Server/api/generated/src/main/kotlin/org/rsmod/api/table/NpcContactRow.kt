// AUTO-GENERATED for dbtable.npc_contact — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class NpcContactRow(
  row: DbHelper,
) {
  public val id: Int = row.int("dbcol.npc_contact:id")

  public val contactId: Int = row.int("dbcol.npc_contact:contact_id")

  public val name: String = row.string("dbcol.npc_contact:name")

  public val headModel: Int = row.column("dbcol.npc_contact:head_model", ModelIdCodec)

  public val zoom: Int = row.int("dbcol.npc_contact:zoom")

  public val yAngle: Int = row.int("dbcol.npc_contact:y_angle")

  public val altName: String? = row.stringOptional("dbcol.npc_contact:alt_name")

  public val altHeadModel: Int? =
      row.columnOptional("dbcol.npc_contact:alt_head_model", ModelIdCodec)

  public val altZoom: Int? = row.intOptional("dbcol.npc_contact:alt_zoom")

  public val altYAngle: Int? = row.intOptional("dbcol.npc_contact:alt_y_angle")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<NpcContactRow> by
        lazy { DbHelper.table("dbtable.npc_contact").map { NpcContactRow(it) } }

    public fun all(): List<NpcContactRow> = cachedAll

    public fun getRow(row: Int): NpcContactRow = NpcContactRow(DbHelper.row(row))

    public fun getRow(column: String): NpcContactRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
