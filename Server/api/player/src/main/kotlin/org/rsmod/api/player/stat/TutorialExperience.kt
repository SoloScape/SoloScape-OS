package org.rsmod.api.player.stat

import kotlin.math.min
import org.rsmod.game.stat.PlayerStatMap

public object TutorialExperience {
    public fun limit(progress: Int, stat: String, currentFineXp: Int, awardFineXp: Double): Double {
        if (progress !in 1..999) return awardFineXp
        if (stat == "stat.hitpoints") return 0.0
        val remaining = (174 * PlayerStatMap.XP_FINE_PRECISION - currentFineXp).coerceAtLeast(0)
        return min(awardFineXp, remaining.toDouble())
    }
}
