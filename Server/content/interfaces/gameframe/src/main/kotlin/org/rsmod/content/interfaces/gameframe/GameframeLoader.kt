package org.rsmod.content.interfaces.gameframe

import dev.openrune.definition.type.widget.ComponentType
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.aconverted.enum
import dev.openrune.types.dbcol.DbColumnCodec.ComponentTypeCodec
import dev.openrune.types.dbcol.DbColumnCodec.IntCodec
import org.rsmod.api.player.ui.selectOrbsInterface
import org.rsmod.api.table.GameframeRow
import org.rsmod.game.ui.Component

internal class GameframeLoader {
    fun loadGameframes(): Map<Int, Gameframe> {
        return loadGameframeRows()
    }

    private fun loadGameframeRows(): Map<Int, Gameframe> {

        val mapped = mutableMapOf<Int, Gameframe>()

        GameframeRow.all().forEach { entry ->
            val gameframe = loadGameframe(entry)
            val previous = mapped[gameframe.topLevel.asRSCM(RSCMType.INTERFACE)]
            if (previous != null) {
                val message =
                    "Gameframe for toplevel already exists: '${previous.topLevel}' " +
                        "(previous=$previous, curr=$gameframe)"
                throw IllegalStateException(message)
            }
            mapped[gameframe.topLevel.asRSCM(RSCMType.INTERFACE)] = gameframe
        }

        // The cache ships the original mobile widgets and redirect enum, but
        // SoloScape's custom gameframe table currently contains desktop rows.
        val mobileTop = "interface.toplevel_osm"
        val mobileId = mobileTop.asRSCM(RSCMType.INTERFACE)
        if (mobileId !in mapped) {
            // Redirects include packed pseudo-components (for example 600:65535)
            // without widget definitions. Preserve their IDs instead of resolving
            // them through the nullable ComponentType codec.
            val mobileMappings = enum("enum.mobile_pane_redirect", IntCodec, IntCodec)
                .filter { it.key != -1 && it.value != -1 }
                .associate { Component(it.key) to Component(it.value) }
            mapped[mobileId] = Gameframe(
                topLevel = mobileTop,
                overlays = overlays.map {
                    if (it.interf == "interface.orbs") {
                        it.copy(interf = selectOrbsInterface(mobile = true, minimized = false))
                    } else it
                },
                mappings = mobileMappings,
                clientMode = 2,
                resizable = true,
                isDefault = false,
                stoneArrangement = true,
            )
        }

        return mapped
    }

    private fun loadGameframe(row: GameframeRow): Gameframe {
        val topLevel = RSCM.getReverseMapping(RSCMType.INTERFACE, row.toplevel)
        val clientMode = row.clientMode
        val resizable = row.resizable
        val isDefault = row.default
        val stoneArrangement = row.stoneArrangement

        val mappings =
            row.mappings.filterValuesNotNull().associate { Component(it.key.packed) to Component(it.value.packed) }

        return Gameframe(
            topLevel = topLevel,
            overlays = overlays,
            mappings = mappings,
            clientMode = clientMode,
            resizable = resizable,
            isDefault = isDefault,
            stoneArrangement = stoneArrangement,
        )
    }

    fun loadMoveEvents(): Map<String, String> =
        enum("enum.toplevel_move_events", ComponentTypeCodec, ComponentTypeCodec).associate {
            val from = RSCM.getReverseMapping(RSCMType.COMPONENT, it.key.packed)
            val to = RSCM.getReverseMapping(RSCMType.COMPONENT, it.value.packed)
            from to to
        }

    val overlays: List<GameframeOverlay> =
        listOf(
            GameframeOverlay("interface.chatbox", "component.toplevel_osrs_stretch:chat_container"),
            GameframeOverlay("interface.buff_bar", "component.toplevel_osrs_stretch:buff_bar"),
            GameframeOverlay("interface.stat_boosts_hud", "component.toplevel_osrs_stretch:stat_boosts_hud"),
            GameframeOverlay("interface.pm_chat", "component.toplevel_osrs_stretch:pm_container"),
            GameframeOverlay("interface.hpbar_hud", "component.toplevel_osrs_stretch:hpbar_hud"),
            GameframeOverlay("interface.orbs", "component.toplevel_osrs_stretch:orbs"),
            GameframeOverlay("interface.xp_drops", "component.toplevel_osrs_stretch:xp_drops"),
            GameframeOverlay("interface.popout", "component.toplevel_osrs_stretch:popout"),
            GameframeOverlay("interface.ehc_worldhop", "component.toplevel_osrs_stretch:tli_listener"),
            GameframeOverlay("interface.stats", "component.toplevel_osrs_stretch:side1"),
            GameframeOverlay("interface.side_journal", "component.toplevel_osrs_stretch:side2"),
            GameframeOverlay("interface.inventory", "component.toplevel_osrs_stretch:side3"),
            GameframeOverlay("interface.wornitems", "component.toplevel_osrs_stretch:side4"),
            GameframeOverlay("interface.prayerbook", "component.toplevel_osrs_stretch:side5"),
            GameframeOverlay("interface.magic_spellbook", "component.toplevel_osrs_stretch:side6"),
            GameframeOverlay("interface.friends", "component.toplevel_osrs_stretch:side9"),
            GameframeOverlay("interface.account", "component.toplevel_osrs_stretch:side8"),
            GameframeOverlay("interface.logout", "component.toplevel_osrs_stretch:side10"),
            GameframeOverlay("interface.settings_side", "component.toplevel_osrs_stretch:side11"),
            GameframeOverlay("interface.emote", "component.toplevel_osrs_stretch:side12"),
            GameframeOverlay("interface.music", "component.toplevel_osrs_stretch:side13"),
            GameframeOverlay("interface.side_channels", "component.toplevel_osrs_stretch:side7"),
            GameframeOverlay("interface.combat_interface", "component.toplevel_osrs_stretch:side0"),
            GameframeOverlay("interface.notification_display", "component.toplevel_osrs_stretch:notifications"),
        )
}
