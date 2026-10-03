package dev.or2.central.notify

import org.slf4j.LoggerFactory
import javax.sql.DataSource

class PgNotifyService(
    private val dataSource: DataSource,
    private val handlers: Map<String, PgNotifyHandler>,
) {
    private val log = LoggerFactory.getLogger(PgNotifyService::class.java)
    @Volatile private var stopped = true
    private var thread: Thread? = null

    fun start() {
        if (!stopped) return
        stopped = false
        thread = Thread({
            while (!stopped) {
                try {
                    poll()
                    Thread.sleep(200)
                } catch (_: InterruptedException) {
                    break
                } catch (e: Exception) {
                    if (!stopped) log.warn("SQLite notification delivery failed; retrying", e)
                    try { Thread.sleep(500) } catch (_: InterruptedException) { break }
                }
            }
        }, "central-sqlite-notify").apply { isDaemon = true; start() }
    }

    fun stop() {
        stopped = true
        thread?.interrupt()
        thread?.join(2000)
        thread = null
    }

    internal fun poll() {
        val events = dataSource.connection.use { conn ->
            conn.createStatement().use { statement ->
                statement.executeQuery("SELECT id, channel, payload FROM notification_outbox ORDER BY id LIMIT 100").use { rs ->
                    buildList { while (rs.next()) add(Triple(rs.getLong(1), rs.getString(2), rs.getString(3))) }
                }
            }
        }
        for ((id, channel, payload) in events) {
            handlers[channel]?.handle(payload)
            dataSource.connection.use { conn ->
                conn.prepareStatement("DELETE FROM notification_outbox WHERE id = ?").use {
                    it.setLong(1, id)
                    it.executeUpdate()
                }
            }
        }
    }
}
