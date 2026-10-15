package org.rsmod.content.other.xprates

import org.rsmod.game.entity.Player

/**
 * A single XP policy shared by account logins, simulated bot registration,
 * admin rate changes, and xp-rates.yml reloads.
 *
 * The native statAdvance implementation multiplies player.xpRate by
 * player.globalXpRate. In global-only mode the personal component MUST be 1.0
 * or stored legacy account rates (including 150x) multiply global-rate again.
 */
internal object XpRatePolicy {
    fun apply(player: Player, config: XpRateConfig) {
        player.globalXpRate = config.globalRate
        when {
            config.globalOnly -> player.xpRate = XpRateConfig.AUTHENTIC_RATE
            config.enforceOnLogin -> player.xpRate = config.rate
        }
    }

    fun effective(player: Player): Double = player.xpRate * player.globalXpRate
}
