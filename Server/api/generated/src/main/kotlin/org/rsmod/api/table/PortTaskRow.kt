// AUTO-GENERATED for dbtable.port_task — do not edit.
package org.rsmod.api.table

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.types.NpcServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.dbcol.DbColumnCodec
import dev.openrune.types.dbcol.DbHelper
import dev.openrune.types.dbcol.ModelIdCodec
import dev.openrune.types.dbcol.booleanOptional
import dev.openrune.types.dbcol.column
import dev.openrune.types.dbcol.columnOptional
import dev.openrune.types.dbcol.dbRow
import dev.openrune.types.dbcol.int
import dev.openrune.types.dbcol.intOptional
import dev.openrune.types.dbcol.multiColumnMixedOptional
import dev.openrune.types.dbcol.npcOptional
import dev.openrune.types.dbcol.objOptional
import dev.openrune.types.dbcol.string
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import kotlin.collections.List
import org.rsmod.api.table.Tuple2
import org.rsmod.api.table.sailing.SailingDockRow
import org.rsmod.api.table.toListOfTuple2
import org.rsmod.api.table.toTuple2

public class PortTaskRow(
  row: DbHelper,
) {
  public val taskId: Int = row.int("dbcol.port_task:task_id")

  public val name: String = row.string("dbcol.port_task:name")

  public val taskType: Int = row.int("dbcol.port_task:task_type")

  public val levelRequired: Int = row.int("dbcol.port_task:level_required")

  public val startingPort: SailingDockRow? by
      lazy { row.columnOptional("dbcol.port_task:starting_port", DbColumnCodec.DbRowTypeCodec)?.let { SailingDockRow.getRow(it.id) } }

  public val cargoPort: SailingDockRow? by
      lazy { row.columnOptional("dbcol.port_task:cargo_port", DbColumnCodec.DbRowTypeCodec)?.let { SailingDockRow.getRow(it.id) } }

  public val endingPort: SailingDockRow by
      lazy { SailingDockRow.getRow(row.dbRow("dbcol.port_task:ending_port").id) }

  public val cancellable: Boolean? = row.booleanOptional("dbcol.port_task:cancellable")

  public val facilitiesRequired: Tuple2<ObjectServerType?, String?>? =
      row.multiColumnMixedOptional("dbcol.port_task:facilities_required", DbColumnCodec.LocTypeCodec, DbColumnCodec.StringCodec).toTuple2()

  public val facilititesRecommended: Tuple2<ObjectServerType?, String?>? =
      row.multiColumnMixedOptional("dbcol.port_task:facilitites_recommended", DbColumnCodec.LocTypeCodec, DbColumnCodec.StringCodec).toTuple2()

  public val boatCombatRequired: Boolean? =
      row.booleanOptional("dbcol.port_task:boat_combat_required")

  public val regularCombatRequired: Int? =
      row.intOptional("dbcol.port_task:regular_combat_required")

  public val combatRecommended: Int? = row.intOptional("dbcol.port_task:combat_recommended")

  public val deliveryObject: ItemServerType? = row.objOptional("dbcol.port_task:delivery_object")

  public val cargo: List<Tuple2<ItemServerType, Int>> =
      row.multiColumnMixedOptional("dbcol.port_task:cargo", DbColumnCodec.ItemServerTypeCodec, DbColumnCodec.IntCodec).toListOfTuple2()

  public val portCheckpoint: Int? = row.intOptional("dbcol.port_task:port_checkpoint")

  public val bountyTargetAlive: NpcServerType? =
      row.npcOptional("dbcol.port_task:bounty_target_alive")

  public val bountyTargetDead: NpcServerType? =
      row.npcOptional("dbcol.port_task:bounty_target_dead")

  public val bountyObject: ItemServerType? = row.objOptional("dbcol.port_task:bounty_object")

  public val bountyObjectAmount: Int? = row.intOptional("dbcol.port_task:bounty_object_amount")

  public val bountyObjectRarity: Int? = row.intOptional("dbcol.port_task:bounty_object_rarity")

  public val taskBoardGraphic: Int = row.column("dbcol.port_task:task_board_graphic", ModelIdCodec)

  public val flavourText: String = row.string("dbcol.port_task:flavour_text")

  public val rowId: Int = row.id

  public val tableId: Int = row.tableId

  public companion object {
    private val cachedAll: List<PortTaskRow> by
        lazy { DbHelper.table("dbtable.port_task").map { PortTaskRow(it) } }

    public fun all(): List<PortTaskRow> = cachedAll

    public fun getRow(row: Int): PortTaskRow = PortTaskRow(DbHelper.row(row))

    public fun getRow(column: String): PortTaskRow {
      RSCM.requireRSCM(RSCMType.DBROW, column)
      return getRow(column.asRSCM() and 0xFFFF)
    }
  }
}
