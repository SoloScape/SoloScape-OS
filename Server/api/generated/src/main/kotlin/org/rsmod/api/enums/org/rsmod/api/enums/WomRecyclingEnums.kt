// AUTO-GENERATED enum accessors — do not edit. Run cache build to refresh. wom_recycling
package org.rsmod.api.enums

import dev.openrune.definition.type.DBRowType
import dev.openrune.types.ItemServerType
import dev.openrune.types.enums.EnumTypeMap
import dev.openrune.types.enums.`enum`
import kotlin.Int

public object WomRecyclingEnums {
  public val wom_recycling_free_quests: EnumTypeMap<EnumTypeMap<Int, ItemServerType>, DBRowType> =
      enum("wom_recycling_free_quests")

  public val wom_recycling_members_quests: EnumTypeMap<EnumTypeMap<Int, ItemServerType>, DBRowType>
      = enum("wom_recycling_members_quests")

  public val wom_recycling_tabs:
      EnumTypeMap<Int, EnumTypeMap<Int, EnumTypeMap<Int, ItemServerType>>> =
      enum("wom_recycling_tabs")
}
