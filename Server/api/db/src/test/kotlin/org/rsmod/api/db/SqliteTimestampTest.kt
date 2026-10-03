package org.rsmod.api.db

import java.sql.DriverManager
import java.sql.Timestamp
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.rsmod.api.db.util.getLocalDateTime

class SqliteTimestampTest {
    @Test
    fun `reads persisted epoch milliseconds and nullable timestamps`() {
        val timestamp = Timestamp(1234567890000L)
        DriverManager.getConnection("jdbc:sqlite::memory:").use { connection ->
            connection.prepareStatement("SELECT ? AS muted_until, NULL AS banned_until").use {
                it.setTimestamp(1, timestamp)
                it.executeQuery().use { rs ->
                    rs.next()
                    assertEquals(timestamp.toLocalDateTime(), rs.getLocalDateTime("muted_until"))
                    assertNull(rs.getLocalDateTime("banned_until"))
                }
            }
        }
    }
}
