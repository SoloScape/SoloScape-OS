package org.rsmod.content.other.bots

import com.fasterxml.jackson.databind.ObjectMapper
import com.github.michaelbull.logging.InlineLogger
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.time.Instant
import java.util.Properties
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import org.rsmod.game.entity.Player

internal data class HighscoreSkill(val level: Int, val xp: Int)

internal data class HighscoreEntry(
    val id: String,
    val name: String,
    val bot: Boolean,
    val online: Boolean,
    val updatedAt: String,
    val skills: Map<String, HighscoreSkill>,
    val totalLevel: Int,
    val totalXp: Long,
)

/** Ranked using XP first, then level, then name; a bot is never excluded from skill rankings. */
internal object HighscoreRanking {
    val skills: List<String> = BotSkills.all.map { it.removePrefix("stat.") }

    fun ranks(entries: Collection<HighscoreEntry>, skill: String = "overall"): List<HighscoreEntry> {
        require(skill == "overall" || skill in skills)
        return if (skill == "overall") entries.sortedWith(
            compareByDescending<HighscoreEntry> { it.totalXp }
                .thenByDescending { it.totalLevel }
                .thenBy { it.name.lowercase() }
                .thenBy { it.id }
        ) else entries.sortedWith(
            compareByDescending<HighscoreEntry> { it.skills[skill]?.xp ?: 0 }
                .thenByDescending { it.skills[skill]?.level ?: 1 }
                .thenBy { it.name.lowercase() }
                .thenBy { it.id }
        )
    }
}

/**
 * A read-only highscores web page separate from the bot debugger.
 *
 * Capture runs only on the game thread. HTTP and disk workers read published immutable
 * JSON strings, never mutable player state. Only display names and skill data are exported.
 * Offline rows are retained from previous sessions; we do not publish inventory/account IDs.
 */
@Singleton
class BotHighscores internal constructor(
    private val output: Path,
) {
    @Inject constructor() : this(Path.of(".data", "highscores", "snapshot.json"))

    private val logger = InlineLogger()
    private val mapper = ObjectMapper()
    private val entries = LinkedHashMap<String, HighscoreEntry>()

    @Volatile private var published = """{"updatedAt":null,"skills":[],"entries":[]}"""
    private var server: HttpServer? = null
    private var httpWorker: ExecutorService? = null
    private var diskWorker: ScheduledExecutorService? = null

    private val config: Properties by lazy {
        Properties().apply {
            val path = Path.of(".data", "bots.properties")
            if (Files.isRegularFile(path)) Files.newInputStream(path).use { load(it) }
        }
    }

    fun start() {
        val enabled = config.getProperty("highscores.enabled", "true").toBoolean()
        if (!enabled || server != null) return
        val port = (config.getProperty("highscores.port", "7072").toIntOrNull() ?: 7072)
            .coerceIn(1, 65535)
        startHttp(port)
    }

    internal fun startHttp(port: Int) {
        if (server != null) return
        load()
        try {
            // Intentional localhost bind: an operator may reverse-proxy /highscores publicly,
            // without also exposing the private bot-debugging endpoints.
            val http = HttpServer.create(InetSocketAddress("127.0.0.1", port), 0)
            val worker = Executors.newSingleThreadExecutor { task ->
                Thread(task, "highscores-http").apply { isDaemon = true }
            }
            http.executor = worker
            http.createContext("/highscores.json") { exchange ->
                when {
                    exchange.requestMethod != "GET" -> send(exchange, 405, "text/plain", "Method not allowed")
                    exchange.requestURI.path != "/highscores.json" ->
                        send(exchange, 404, "text/plain", "Not found")
                    else -> send(exchange, 200, "application/json", published)
                }
            }
            http.createContext("/highscores") { exchange ->
                when {
                    exchange.requestMethod != "GET" -> send(exchange, 405, "text/plain", "Method not allowed")
                    exchange.requestURI.path !in setOf("/highscores", "/highscores/") ->
                        send(exchange, 404, "text/plain", "Not found")
                    else -> {
                        val html = javaClass.getResourceAsStream("/highscores.html")?.use {
                            it.readAllBytes().toString(StandardCharsets.UTF_8)
                        }
                        if (html == null) send(exchange, 503, "text/plain", "Highscores page missing")
                        else send(exchange, 200, "text/html", html)
                    }
                }
            }
            httpWorker = worker
            server = http
            http.start()
            diskWorker = Executors.newSingleThreadScheduledExecutor { task ->
                Thread(task, "highscores-save").apply { isDaemon = true }
            }.also {
                it.scheduleWithFixedDelay({ saveSafely() }, 30, 30, TimeUnit.SECONDS)
            }
            logger.info { "Highscores available at http://127.0.0.1:$port/highscores" }
        } catch (error: Exception) {
            server?.stop(0)
            server = null
            httpWorker?.shutdownNow()
            httpWorker = null
            logger.error(error) { "Could not start highscores HTTP endpoint" }
        }
    }

    private fun send(exchange: HttpExchange, status: Int, type: String, body: String) {
        val bytes = body.toByteArray(StandardCharsets.UTF_8)
        exchange.responseHeaders.set("Content-Type", "$type; charset=utf-8")
        exchange.responseHeaders.set("Cache-Control", "no-store, max-age=0")
        exchange.responseHeaders.set("X-Content-Type-Options", "nosniff")
        exchange.sendResponseHeaders(status, bytes.size.toLong())
        exchange.responseBody.use { it.write(bytes) }
    }

    /** On the game thread only. Every scan also marks absent characters as offline. */
    fun capture(players: Iterable<Player>, isBot: (Player) -> Boolean) {
        val online = HashSet<String>()
        for (player in players) {
            if (player.username.isBlank()) continue
            val id = player.username.lowercase()
            online += id
            entries[id] = character(player, isBot(player), true)
        }
        for ((id, previous) in entries.toMap()) {
            if (id !in online && previous.online) entries[id] = previous.copy(online = false)
        }
        publish()
    }

    /** Called while the player's stat map is still intact, before registry deletion. */
    fun departing(player: Player, wasBot: Boolean) {
        if (player.username.isBlank()) return
        val id = player.username.lowercase()
        entries[id] = character(player, wasBot || entries[id]?.bot == true, false)
        publish()
    }

    private fun character(player: Player, bot: Boolean, online: Boolean): HighscoreEntry {
        val skills = HighscoreRanking.skills.associateWith { name ->
            val stat = "stat.$name"
            HighscoreSkill(
                level = player.statMap.getBaseLevel(stat).toInt() and 0xff,
                xp = player.statMap.getXP(stat).coerceAtLeast(0),
            )
        }
        return HighscoreEntry(
            id = player.username.lowercase(),
            name = player.displayName.ifBlank { player.username },
            bot = bot,
            online = online,
            updatedAt = Instant.now().toString(),
            skills = skills,
            totalLevel = skills.values.sumOf { it.level },
            totalXp = skills.values.sumOf { it.xp.toLong() },
        )
    }

    private fun publish() {
        val ranking = HighscoreRanking.ranks(entries.values)
        published = mapper.writeValueAsString(mapOf(
            "updatedAt" to Instant.now().toString(),
            "skills" to HighscoreRanking.skills,
            "entries" to ranking,
        ))
    }

    private fun load() {
        if (!Files.isRegularFile(output)) return
        runCatching {
            val data = mapper.readTree(output.toFile())
            val rows = data.path("entries")
            if (!rows.isArray) return@runCatching
            for (row in rows) {
                val id = row.path("id").asText().lowercase()
                if (id.isBlank() || id.length > 80 || !id.matches(Regex("[a-z0-9_ ]+"))) continue
                val name = row.path("name").asText().take(40)
                val skills = HighscoreRanking.skills.associateWith { name ->
                    val stat = row.path("skills").path(name)
                    HighscoreSkill(
                        stat.path("level").asInt(1).coerceIn(1, 99),
                        stat.path("xp").asInt(0).coerceIn(0, 200_000_000),
                    )
                }
                entries[id] = HighscoreEntry(id, name, row.path("bot").asBoolean(),
                    false, row.path("updatedAt").asText(),
                    skills, skills.values.sumOf { it.level },
                    skills.values.sumOf { it.xp.toLong() })
            }
            publish()
        }.onFailure { logger.error(it) { "Could not read saved highscores" } }
    }

    private fun saveSafely() {
        val json = published
        runCatching {
            Files.createDirectories(output.parent)
            val temp = Files.createTempFile(output.parent, "highscores-", ".tmp")
            try {
                Files.writeString(temp, json, StandardCharsets.UTF_8)
                try {
                    Files.move(temp, output, StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING)
                } catch (_: java.nio.file.AtomicMoveNotSupportedException) {
                    Files.move(temp, output, StandardCopyOption.REPLACE_EXISTING)
                }
            } finally {
                Files.deleteIfExists(temp)
            }
        }.onFailure { logger.error(it) { "Could not save highscores" } }
    }

    fun stop() {
        diskWorker?.shutdownNow()
        diskWorker = null
        saveSafely()
        server?.stop(0)
        server = null
        httpWorker?.shutdownNow()
        httpWorker = null
    }
}
