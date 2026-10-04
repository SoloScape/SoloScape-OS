// AUTO-GENERATED enum accessors — do not edit. Run cache build to refresh. rune
package org.rsmod.api.enums

import dev.openrune.types.ItemServerType
import dev.openrune.types.enums.EnumTypeMap
import dev.openrune.types.enums.`enum`
import kotlin.Boolean
import kotlin.Int

public object RuneEnums {
  public val rune_compact_ids: EnumTypeMap<ItemServerType, Int> = enum("rune_compact_ids")

  public val rune_staves: EnumTypeMap<ItemServerType, EnumTypeMap<ItemServerType, Boolean>> =
      enum("rune_staves")

  public val rune_substitutes: EnumTypeMap<ItemServerType, EnumTypeMap<Int, ItemServerType>> =
      enum("rune_substitutes")
}
