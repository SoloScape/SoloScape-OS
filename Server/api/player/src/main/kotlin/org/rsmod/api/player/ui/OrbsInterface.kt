package org.rsmod.api.player.ui

import org.rsmod.game.entity.Player

public fun selectOrbsInterface(mobile: Boolean, minimized: Boolean): String =
    when {
        mobile && minimized -> "interface.orbs_osm_nomap"
        mobile -> "interface.orbs_osm"
        minimized -> "interface.orbs_nomap"
        else -> "interface.orbs"
    }

public fun Player.orbsInterface(minimized: Boolean = false): String =
    selectOrbsInterface(ui.containsTopLevel("interface.toplevel_osm"), minimized)
