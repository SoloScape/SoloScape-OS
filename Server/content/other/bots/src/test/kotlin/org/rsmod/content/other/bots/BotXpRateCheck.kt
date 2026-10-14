package org.rsmod.content.other.bots

import java.nio.file.Files
import org.rsmod.content.other.xprates.XpRateConfig
import org.rsmod.content.other.xprates.XpRateConfigLoader
import org.rsmod.content.other.xprates.XpRatePolicy
import org.rsmod.game.entity.Player

/** The same policy applies on PlayerRegistry.Initialize, on reload and for admin changes. */
object BotXpRateCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val global = XpRateConfig(rate = 150.0, globalRate = 5.0, globalOnly = true,
            enforceOnLogin = false)
        val human = Player().apply { xpRate = 150.0 }
        val bot = Player().apply { xpRate = 1.0 }
        for (player in listOf(human, bot)) {
            XpRatePolicy.apply(player, global)
            check(player.xpRate == 1.0) { "A personal rate must never multiply global-only XP" }
            check(player.globalXpRate == 5.0)
            check(XpRatePolicy.effective(player) == 5.0)
        }
        val changed = global.copy(globalRate = 2.0)
        for (player in listOf(human, bot, Player())) {
            XpRatePolicy.apply(player, changed)
            check(XpRatePolicy.effective(player) == 2.0) {
                "Rate changes and new bot spawns must match all online players"
            }
        }
        val legacy = global.copy(globalOnly = false, enforceOnLogin = true, rate = 3.0)
        XpRatePolicy.apply(human, legacy)
        check(XpRatePolicy.effective(human) == 15.0)
        val legacyCustom = legacy.copy(enforceOnLogin = false, globalRate = 4.0)
        XpRatePolicy.apply(human, legacyCustom)
        check(XpRatePolicy.effective(human) == 12.0)
        XpRatePolicy.apply(human, changed)
        check(XpRatePolicy.effective(human) == 2.0)

        val file = Files.createTempFile("xp-rate-bots-", ".yml")
        try {
            Files.writeString(file, "rate: 150.0\\nglobal-rate: 8.0\\nglobal-only: true\\nenforce-on-login: false\\n"
                .replace("\\n", "\n"))
            val parsed = XpRateConfigLoader().load(file)
            check(parsed.globalOnly && parsed.rate == 150.0 && parsed.globalRate == 8.0)
            XpRatePolicy.apply(bot, parsed)
            check(XpRatePolicy.effective(bot) == 8.0)
        } finally {
            Files.deleteIfExists(file)
        }
        println("BotXpRateCheck OK: real logins, bot spawns, rate updates, global-only and legacy")
    }
}
