package dev.or2.central.db

import java.nio.file.Files
import java.nio.file.Path
import java.sql.Connection

object SqliteDatabase {
    const val DEFAULT_JDBC_URL = "jdbc:sqlite:.data/soloscape.db"

    fun prepare(jdbcUrl: String) {
        require(jdbcUrl.startsWith("jdbc:sqlite:")) { "Only SQLite JDBC URLs are supported: $jdbcUrl" }
        val file = jdbcUrl.removePrefix("jdbc:sqlite:")
        require(file.isNotBlank() && file != ":memory:" && !file.startsWith("file:")) {
            "Use a persistent SQLite file path shared by the game and Central."
        }
        Path.of(file).toAbsolutePath().parent?.let { Files.createDirectories(it) }
    }

    fun configure(connection: Connection) {
        connection.createStatement().use {
            it.execute("PRAGMA busy_timeout=10000")
            it.execute("PRAGMA foreign_keys=ON")
            it.execute("PRAGMA journal_mode=WAL")
        }
    }
}
