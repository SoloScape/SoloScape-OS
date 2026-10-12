package org.rsmod.api.player.events.skilling

import org.rsmod.events.UnboundEvent
import org.rsmod.game.entity.Player

/** Published after the ingredients are consumed and the result is placed in the inventory. */
public data class SkillingProcessingEvent(
    public val player: Player,
    public val skill: String,
    public val input: String,
    public val output: String,
    public val surface: String? = null,
) : UnboundEvent
