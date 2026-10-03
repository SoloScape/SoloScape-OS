package org.rsmod.api.server.config

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

@JsonIgnoreProperties(ignoreUnknown = true)
public data class OpenRuneCentralGameConfig(
    @JsonProperty("same-instance") val sameInstance: Boolean = false,
    @JsonProperty("http-port") val httpPort: Int = 8080,
    val host: String = "",
    @JsonProperty("link-port") val linkPort: Int = 9091,
    @JsonProperty("world-key") val worldKey: String = "",
    val sqlite: SqliteDbYaml = SqliteDbYaml(),
)

public data class SqliteDbYaml(
    @JsonProperty("jdbc-url") val jdbcUrl: String = "jdbc:sqlite:.data/soloscape.db",
    @JsonProperty("pool-size") val poolSize: Int = 4,
)

@JsonIgnoreProperties(ignoreUnknown = true)
public data class GameDatabaseYaml(
    val sqlite: SqliteDbYaml = SqliteDbYaml(),
)

@JsonIgnoreProperties(ignoreUnknown = true)
public data class GameplayConfig(
    @JsonProperty("quest-requirements")
    val questRequirements: QuestRequirementsYaml = QuestRequirementsYaml(),
    @JsonProperty("drop-rates")
    val dropRates: DropRatesYaml = DropRatesYaml(),
)

@JsonIgnoreProperties(ignoreUnknown = true)
public data class DropRatesYaml(
    val multiplier: Double = 1.0,
)

@JsonIgnoreProperties(ignoreUnknown = true)
public data class QuestRequirementsYaml(
    val mode: String = "assume-completed",
    @JsonProperty("virtual-completions")
    val virtualCompletions: Set<String> = emptySet(),
    @JsonProperty("virtual-lines")
    val virtualLines: Set<String> = emptySet(),
)

@JsonIgnoreProperties(ignoreUnknown = true)
public data class ServerConfig(
    val name: String,
    @JsonProperty("game-port") val gamePort: Int,
    val revision: Int,
    val environment: String,
    val world: Int,
    val gameplay: GameplayConfig = GameplayConfig(),
    val database: GameDatabaseYaml? = null,
    val central: OpenRuneCentralGameConfig? = null,
    @JsonProperty("login-timing-logs") val loginTimingLogs: Boolean = false,
    @JsonProperty("social-pm-trace-logs") val socialPmTraceLogs: Boolean = false,
)
