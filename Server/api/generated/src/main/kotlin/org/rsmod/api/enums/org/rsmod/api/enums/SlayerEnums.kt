// AUTO-GENERATED enum accessors — do not edit. Run cache build to refresh. slayer
package org.rsmod.api.enums

import dev.openrune.definition.type.DBRowType
import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.types.ItemServerType
import dev.openrune.types.enums.EnumTypeMap
import dev.openrune.types.enums.`enum`
import kotlin.Boolean
import kotlin.Int
import kotlin.String

public object SlayerEnums {
  public val slayer_bosses: EnumTypeMap<Int, Boolean> = enum("slayer_bosses")

  public val slayer_disableable_rewards: EnumTypeMap<Int, ItemServerType> =
      enum("slayer_disableable_rewards")

  public val slayer_staff_substitutes: EnumTypeMap<Int, ItemServerType> =
      enum("slayer_staff_substitutes")

  public val slayer_task_tips: EnumTypeMap<Int, String> = enum("slayer_task_tips")

  public val slayer_toggleable_rewards: EnumTypeMap<DBRowType, Int> =
      enum("slayer_toggleable_rewards")

  public val slayer_unlocks: EnumTypeMap<Int, ComponentType> = enum("slayer_unlocks")
}
