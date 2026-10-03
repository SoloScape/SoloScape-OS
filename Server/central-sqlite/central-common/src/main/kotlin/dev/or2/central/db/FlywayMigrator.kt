package dev.or2.central.db

import org.flywaydb.core.Flyway
import java.sql.DriverManager
import javax.sql.DataSource

object FlywayMigrator {
    @Synchronized
    fun migrate(dataSource: DataSource) {
        dataSource.connection.use { connection ->
            SqliteDatabase.prepare(connection.metaData.url)
            SqliteDatabase.configure(connection)
        }
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate()
    }

    @Synchronized
    fun migrate(jdbcUrl: String, user: String, password: String) {
        SqliteDatabase.prepare(jdbcUrl)
        DriverManager.getConnection(jdbcUrl).use { SqliteDatabase.configure(it) }
        Flyway.configure().dataSource(jdbcUrl, user, password)
            .locations("classpath:db/migration").load().migrate()
    }
}
