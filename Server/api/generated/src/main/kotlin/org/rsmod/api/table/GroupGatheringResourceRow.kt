// AUTO-GENERATED for dbtable.group_gathering_resource — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class GroupGatheringResourceRow(
  row: DbHelper,
) {
  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<GroupGatheringResourceRow> by
        lazy { DbHelper.table("dbtable.group_gathering_resource").map { GroupGatheringResourceRow(it) } }

    public fun all(): List<GroupGatheringResourceRow> = cachedAll

    public fun getRow(row: Int): GroupGatheringResourceRow = GroupGatheringResourceRow(DbHelper.row(row))

    public fun getRow(column: String): GroupGatheringResourceRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
