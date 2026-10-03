package org.rsmod.api.db

import dev.or2.central.db.SqliteDatabase
import org.rsmod.api.server.config.ServerConfig

public data class DatabaseConfig(
    public val jdbcUrl: String,
    public val user: String = "sqlite",
    public val password: String = "",
) {
    public companion object {
        public fun create(serverConfig: ServerConfig): DatabaseConfig {
            val jdbc = System.getenv("OPENRUNE_JDBC_URL")?.trim()?.takeIf { it.isNotEmpty() }
                ?: serverConfig.database?.sqlite?.jdbcUrl
                ?: serverConfig.central?.sqlite?.jdbcUrl
                ?: SqliteDatabase.DEFAULT_JDBC_URL
            SqliteDatabase.prepare(jdbc)
            return DatabaseConfig(jdbc)
        }
    }
}
