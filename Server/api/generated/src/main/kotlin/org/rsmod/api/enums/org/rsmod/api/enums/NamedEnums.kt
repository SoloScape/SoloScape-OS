// AUTO-GENERATED enum accessors — do not edit. Run cache build to refresh. named singleton clusters (one enum per slug group)
package org.rsmod.api.enums

import dev.openrune.definition.type.DBRowType
import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.types.ItemServerType
import dev.openrune.types.ObjectServerType
import dev.openrune.types.StatType
import dev.openrune.types.enums.EnumTypeMap
import dev.openrune.types.enums.`enum`
import kotlin.Boolean
import kotlin.Int
import kotlin.String
import org.rsmod.map.CoordGrid

public object NamedEnums {
  public val air_unlimited_runes_hiprio: EnumTypeMap<Int, ItemServerType> =
      enum("air_unlimited_runes_hiprio")

  public val canoe_station_axe_rates: EnumTypeMap<ItemServerType, Int> =
      enum("canoe_station_axe_rates")

  public val data_orbs_setting_prereq: EnumTypeMap<Int, Int> = enum("data_orbs_setting_prereq")

  public val data_orbs_setting_prereq_values: EnumTypeMap<Int, Int> =
      enum("data_orbs_setting_prereq_values")

  public val disabled_skills: EnumTypeMap<StatType, Boolean> = enum("disabled_skills")

  public val drew_sandstone_amounts: EnumTypeMap<ItemServerType, Int> =
      enum("drew_sandstone_amounts")

  public val emote_names: EnumTypeMap<Int, String> = enum("emote_names")

  public val fullscreen_pane: EnumTypeMap<Int, Int> = enum("fullscreen_pane")

  public val fullscreen_pane_redirect: EnumTypeMap<ComponentType, ComponentType> =
      enum("fullscreen_pane_redirect")

  public val game_client_layouts: EnumTypeMap<Int, String> = enum("game_client_layouts")

  public val gameframe_dbrows: EnumTypeMap<Int, DBRowType> = enum("gameframe_dbrows")

  public val holiday_items: EnumTypeMap<Int, ItemServerType> = enum("holiday_items")

  public val keybinds: EnumTypeMap<Int, Int> = enum("keybinds")

  public val kourend_diary_tiers: EnumTypeMap<Int, Int> = enum("kourend_diary_tiers")

  public val music_names: EnumTypeMap<Int, ItemServerType> = enum("music_names")

  public val nature_unlimited_runes_loprio: EnumTypeMap<Int, ItemServerType> =
      enum("nature_unlimited_runes_loprio")

  public val signpost_directions: EnumTypeMap<CoordGrid, String> = enum("signpost_directions")

  public val skill_names: EnumTypeMap<StatType, String> = enum("skill_names")

  public val slayer_unlocks_cost: EnumTypeMap<Int, String> = enum("slayer_unlocks_cost")

  public val spellbook_achievement_diary_types: EnumTypeMap<Int, String> =
      enum("spellbook_achievement_diary_types")

  public val tackle_box_storable: EnumTypeMap<Int, ItemServerType> = enum("tackle_box_storable")

  public val toa_invocations: EnumTypeMap<Int, Int> = enum("toa_invocations")

  public val toplevel_move_events: EnumTypeMap<ComponentType, ComponentType> =
      enum("toplevel_move_events")

  public val weapon_last_stance_varbits: EnumTypeMap<Int, Int> = enum("weapon_last_stance_varbits")

  public val wilderness_course_obstacles: EnumTypeMap<Int, ObjectServerType> =
      enum("wilderness_course_obstacles")

  public val world_map_dropdown_list: EnumTypeMap<Int, Int> = enum("world_map_dropdown_list")
}
