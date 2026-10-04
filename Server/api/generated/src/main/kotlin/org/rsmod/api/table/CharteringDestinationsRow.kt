// AUTO-GENERATED for dbtable.chartering_destinations — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.coord
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumn
import dev.openrune.types.dbcol.string
import dev.openrune.types.dbcol.stringOptional
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.map.CoordGrid

public class CharteringDestinationsRow(
  row: DbHelper,
) {
  public val charteringDestinationId: Int =
      row.int("dbcol.chartering_destinations:chartering_destination_id")

  public val charteringDestinationName: String =
      row.string("dbcol.chartering_destinations:chartering_destination_name")

  public val charteringDestinationInlineName: String? =
      row.stringOptional("dbcol.chartering_destinations:chartering_destination_inline_name")

  public val charteringDestinationPortCoord: CoordGrid =
      row.coord("dbcol.chartering_destinations:chartering_destination_port_coord")

  public val charteringDestinationXPos: Int =
      row.int("dbcol.chartering_destinations:chartering_destination_x_pos")

  public val charteringDestinationYPos: Int =
      row.int("dbcol.chartering_destinations:chartering_destination_y_pos")

  public val charteringDestinationInzone: List<CoordGrid> =
      row.multiColumn("dbcol.chartering_destinations:chartering_destination_inzone", DbColumnCodec.CoordGridCodec, DbColumnCodec.CoordGridCodec)

  public val restrictedContent: Int? =
      row.intOptional("dbcol.chartering_destinations:restricted_content")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<CharteringDestinationsRow> by
        lazy { DbHelper.table("dbtable.chartering_destinations").map { CharteringDestinationsRow(it) } }

    public fun all(): List<CharteringDestinationsRow> = cachedAll

    public fun getRow(row: Int): CharteringDestinationsRow = CharteringDestinationsRow(DbHelper.row(row))

    public fun getRow(column: String): CharteringDestinationsRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
