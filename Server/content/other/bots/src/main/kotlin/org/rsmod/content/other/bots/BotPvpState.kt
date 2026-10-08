package org.rsmod.content.other.bots

import org.rsmod.game.entity.Player
import org.rsmod.map.CoordGrid

internal class BotPvpState(
    val profile: BotPvpProfile,
    val loadout: BotPvpLoadout,
    val hotspotId: String? = null,
    val risk: BotPvpRiskAssignment = BotPvpRiskLoadouts.assignment(profile.id, loadout),
    val identity: Int = 0,
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
    var nextOneTickCheck = 0
    var lastOneTickAt = -10_000
    var specialQueuedAt = -1
    var instantSpecialQueued = false
    var energyAtSpec = 0
    var returnStyle = loadout.primaryStyle
    var retreatStartedAt = -1
    var restockAt = -1
    var dead = false
    var returning = false
    var lastCoords = CoordGrid(0, 0)
    var stationary = 0
    var preventSkull = false
    var patrolStep = 0
}
