package org.rsmod.content.other.bots

import org.rsmod.game.entity.Player

internal class BotPvpState(
    val profile: BotPvpProfile,
    val loadout: BotPvpLoadout,
) {
    val reaction = BotPvpReaction()
    var target: Player? = null
    var style = loadout.primaryStyle
    var nextTargetReview = 0
    var nextPrayerReview = 0
    var nextSpecReview = 0
    var nextFreezeReview = 0
    var nextCombatAction = 0
    var nextSupport = 0
    var nextMove = 0
    var nextVengeance = 0
    var specialQueuedAt = -1
    var instantSpecialQueued = false
    var energyAtSpec = 0
    var returnStyle = loadout.primaryStyle
    var retreatStartedAt = -1
    var restockAt = -1
    var dead = false
    var returning = false
    var lastCoords = org.rsmod.map.CoordGrid(0, 0)
    var stationary = 0
}
