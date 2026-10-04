// AUTO-GENERATED for dbtable.cluehelper_target_key — do not edit.
package org.rsmod.api.table.cluehelper

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.NpcServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.InvIdCodec
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.list
import dev.openrune.types.dbcol.loc
import dev.openrune.types.dbcol.obj
import dev.openrune.types.dbcol.string
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class CluehelperTargetKeyRow(
  row: DbHelper,
) {
  public val loc: ObjectServerType = row.loc("dbcol.cluehelper_target_key:loc")

  public val locCoord: CoordGrid = row.coord("dbcol.cluehelper_target_key:loc_coord")

  public val npcs: List<NpcServerType> =
      row.list("dbcol.cluehelper_target_key:npcs", DbColumnCodec.NpcTypeCodec)

  public val key: ItemServerType = row.obj("dbcol.cluehelper_target_key:key")

  public val keyCoord: CoordGrid = row.coord("dbcol.cluehelper_target_key:key_coord")

  public val inv: Int? = row.columnOptional("dbcol.cluehelper_target_key:inv", InvIdCodec)

  public val count: Int? = row.intOptional("dbcol.cluehelper_target_key:count")

  public val description: String = row.string("dbcol.cluehelper_target_key:description")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CluehelperTargetKeyRow> by
        lazy { DbHelper.table("dbtable.cluehelper_target_key").map { CluehelperTargetKeyRow(it) } }

    public fun all(): List<CluehelperTargetKeyRow> = cachedAll

    public fun getRow(row: Int): CluehelperTargetKeyRow = CluehelperTargetKeyRow(DbHelper.row(row))

    public fun getRow(column: String): CluehelperTargetKeyRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
