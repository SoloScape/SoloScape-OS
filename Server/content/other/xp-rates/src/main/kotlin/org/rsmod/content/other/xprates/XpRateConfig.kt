package org.rsmod.content.other.xprates

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.github.michaelbull.logging.InlineLogger
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.io.path.exists
import kotlin.io.path.writeText

/**
 * Experience rate settings, read from `xp-rates.yml` next to `game.yml`.
 *
 * @param globalOnly When `true` (default), `global-rate` is the **only** XP multiplier for
 *   every real player and simulated bot. Personal multipliers are fixed at 1x, including old
 *   account rates and bot respawns.
 * @param rate Legacy per-player experience multiplier, applied only if [globalOnly] is false.
 * @param globalRate Server-wide XP multiplier applied to all players and bots.
 * @param enforceOnLogin Legacy setting controlling whether [rate] overrides stored personal rates
 *   when [globalOnly] is false. It cannot override the global-only policy.
 * @param resetExistingLevels When `true`, each character has their skills reset to fresh-account
 *   values the first time they log in, to clear levels earned at an old inflated rate. This is
 *   destructive and irreversible, so it defaults to `false`. Every character is flagged once it has
 *   been reset, so this only ever fires once per character and is safe to leave on.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class XpRateConfig(
    val rate: Double = AUTHENTIC_RATE,
    @JsonProperty("global-rate") val globalRate: Double = AUTHENTIC_RATE,
    @JsonProperty("global-only") val globalOnly: Boolean = true,
    @JsonProperty("enforce-on-login") val enforceOnLogin: Boolean = true,
    @JsonProperty("reset-existing-levels") val resetExistingLevels: Boolean = false,
) {
    /**
     * Returns a copy with both rates clamped into [MIN_RATE]`..`[MAX_RATE], falling back to
     * [AUTHENTIC_RATE] for values that are not finite. A hand-edited config should never be able to
     * push [org.rsmod.api.player.stat.statAdvance] into the overflow it throws on.
     */
    fun sanitized(): XpRateConfig =
        copy(rate = clampRate(rate), globalRate = clampRate(globalRate))

    companion object {
        /** Old School RuneScape's own rate. See https://oldschool.runescape.wiki/w/Experience. */
        const val AUTHENTIC_RATE: Double = 1.0

        const val MIN_RATE: Double = 0.01
        const val MAX_RATE: Double = 10_000.0

        fun clampRate(rate: Double): Double =
            if (rate.isFinite()) rate.coerceIn(MIN_RATE, MAX_RATE) else AUTHENTIC_RATE
    }
}

/**
 * Reads [XpRateConfig] from disk, writing a commented default file the first time the server boots
 * with this plugin installed.
 *
 * The default file is written from a literal template rather than serialized from [XpRateConfig] so
 * that the comments explaining each knob survive; a server owner editing this by hand is the whole
 * point of the file existing.
 */
class XpRateConfigLoader {
    private val logger = InlineLogger()

    fun loadOrCreate(file: Path = DEFAULT_FILE): XpRateConfig {
        if (!file.exists()) {
            file.writeText(DEFAULT_FILE_CONTENTS)
            logger.info { "Created default xp rate config in file: $file" }
            return XpRateConfig()
        }
        return load(file)
    }

    fun load(file: Path): XpRateConfig {
        val parsed =
            runCatching { yamlMapper.readValue(file.toFile(), XpRateConfig::class.java) }
                .getOrElse { error ->
                    logger.warn(error) { "Could not read '$file'; using authentic xp rates." }
                    return XpRateConfig()
                }
        val sanitized = parsed.sanitized()
        if (sanitized != parsed) {
            logger.warn {
                "Clamped out-of-range xp rates in '$file': $parsed -> $sanitized " +
                    "(valid range: ${XpRateConfig.MIN_RATE}-${XpRateConfig.MAX_RATE})"
            }
        }
        return sanitized
    }

    companion object {
        val DEFAULT_FILE: Path = Paths.get("./", "xp-rates.yml")

        private val yamlMapper: ObjectMapper = ObjectMapper(YAMLFactory()).registerKotlinModule()

        private val DEFAULT_FILE_CONTENTS =
            """
            # Experience rates.
            #
            # 1.0 is authentic Old School RuneScape. Every skill keeps the xp values Jagex uses -
            # 4 xp per damage in combat, 25 xp per willow log, and so on - and this multiplier is
            # applied on top of them.
            #
            #   https://oldschool.runescape.wiki/w/Experience
            #   https://oldschool.runescape.wiki/w/Skills
            #
            # This is the only XP rate used by all real players and bots when global-only is true.
            # Set to 5.0 for 5x XP, or 1.0 for authentic OSRS XP.
            global-rate: 1.0

            # Prevent stored personal rates (including legacy 150x realm defaults) from stacking
            # on top of the global rate. Applies instantly to newly registered bots and players.
            global-only: true

            # Legacy per-character XP rate. Ignored when global-only is true.
            rate: 1.0

            # Legacy option. Only used when global-only is false; then it overrides personal XP
            # multipliers on player login, and permits ::setxprate to change individual rates.
            enforce-on-login: true

            # Wipe levels that were earned at an old, inflated rate.
            #
            # When this is on, each character's skills are reset to fresh-account values (all 1,
            # Hitpoints 10) the first time they log in. Items, bank, quests and location are not
            # touched. Each character is flagged once it has been reset, so this fires once per
            # character and is safe to leave on afterwards.
            #
            # THIS IS DESTRUCTIVE AND CANNOT BE UNDONE. Turn it on deliberately, once, after you
            # have settled on `global-rate` above. `::resetxp [player]` and `::resetxpall` do the same
            # thing on demand if you would rather pick who and when.
            reset-existing-levels: false
            """
                .trimIndent() + "\n"
    }
}
