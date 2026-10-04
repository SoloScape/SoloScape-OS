// AUTO-GENERATED for dbtable.collection_log_categories — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List

public class CollectionLogCategoriesRow(
  row: DbHelper,
) {
  public val structId: Int = row.int("dbcol.collection_log_categories:struct_id")

  public val completedVarbit: Int = row.int("dbcol.collection_log_categories:completed_varbit")

  public val countVarp1: Int? = row.intOptional("dbcol.collection_log_categories:count_varp_1")

  public val countVarp2: Int? = row.intOptional("dbcol.collection_log_categories:count_varp_2")

  public val countVarp3: Int? = row.intOptional("dbcol.collection_log_categories:count_varp_3")

  public val pbVarp1: Int? = row.intOptional("dbcol.collection_log_categories:pb_varp_1")

  public val pbVarp2: Int? = row.intOptional("dbcol.collection_log_categories:pb_varp_2")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CollectionLogCategoriesRow> by
        lazy { DbHelper.table("dbtable.collection_log_categories").map { CollectionLogCategoriesRow(it) } }

    public fun all(): List<CollectionLogCategoriesRow> = cachedAll

    public fun getRow(row: Int): CollectionLogCategoriesRow = CollectionLogCategoriesRow(DbHelper.row(row))

    public fun getRow(column: String): CollectionLogCategoriesRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
