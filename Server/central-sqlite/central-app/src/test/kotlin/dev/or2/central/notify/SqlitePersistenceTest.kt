package dev.or2.central.notify

import dev.or2.central.config.CentralConfig
import dev.or2.central.config.DataSourceFactory
import dev.or2.central.config.JdbcConfig
import dev.or2.central.db.FlywayMigrator
import dev.or2.central.db.repositories.AccountRepository
import dev.or2.central.logs.CentralActivityLog
import dev.or2.central.logs.CentralActivityLogRepository
import dev.or2.sql.OpenRuneSql
import java.sql.Statement
import java.sql.Timestamp
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import kotlin.test.*

class SqlitePersistenceTest {
    @TempDir lateinit var directory: Path

    @Test
    fun `fresh database preserves account inventory stats and logs across reopen`() {
        val config = CentralConfig(jdbc = JdbcConfig("jdbc:sqlite:${directory.resolve("game.db")}"))
        var accountId = 0L
        var characterId = 0
        DataSourceFactory.create(config).use { ds ->
            FlywayMigrator.migrate(ds)
            FlywayMigrator.migrate(ds)
            val accounts = AccountRepository(ds)
            assertTrue(accounts.insertIfAbsent("Tester", "hash", 1234567890000L))
            assertFalse(accounts.insertIfAbsent("tester", "other", 1234567890000L))
            assertTrue(accounts.collisionKeyTaken("tester"))
            assertFalse(accounts.collisionKeyTaken("different"))
            accountId = accounts.findByUsername("TESTER")!!.id
            ds.connection.use { conn ->
                conn.createStatement().use { st ->
                    st.execute("INSERT INTO realms(realm_id,name) VALUES (255,'test')")
                    st.execute("INSERT INTO worlds(world_id,host,activity,realm_id) VALUES (255,'localhost','test',255)")
                }
                conn.prepareStatement(OpenRuneSql.text("game/character/characters_insert_display_name_from_account.sql"), Statement.RETURN_GENERATED_KEYS).use { ps ->
                    ps.setLong(1, accountId); ps.setLong(2, accountId)
                    assertEquals(1, ps.executeUpdate())
                    ps.generatedKeys.use { keys -> assertTrue(keys.next()); characterId = keys.getInt(1) }
                }
                conn.createStatement().use { st ->
                    st.execute("INSERT INTO inventories VALUES ($characterId,'inv.bank')")
                    st.execute("INSERT INTO inventory_objs VALUES ($characterId,'inv.bank',0,'obj.coins',500,0)")
                    st.execute("INSERT INTO stats(character_id,stat_id,vis_level,base_level,fine_xp) VALUES ($characterId,0,42,42,10000)")
                }
                conn.prepareStatement(OpenRuneSql.text("game/inventory/upsert_inventory_obj.sql")).use { ps ->
                    ps.setInt(1, characterId); ps.setString(2, "inv.bank"); ps.setInt(3, 0)
                    ps.setString(4, "obj.coins"); ps.setInt(5, 750); ps.setInt(6, 0)
                    ps.executeUpdate()
                }
                conn.prepareStatement(OpenRuneSql.text("game/stats/upsert_stat.sql")).use { ps ->
                    ps.setInt(1, characterId); ps.setInt(2, 0); ps.setInt(3, 43)
                    ps.setInt(4, 43); ps.setInt(5, 11000)
                    ps.executeUpdate()
                }
                conn.prepareStatement(OpenRuneSql.text("central/session/insert.sql"), Statement.RETURN_GENERATED_KEYS).use { ps ->
                    ps.setLong(1, accountId); ps.setInt(2, 255); ps.setInt(3, characterId)
                    ps.setBytes(4, byteArrayOf(1, 2, 3)); ps.setLong(5, 1234567890000L); ps.setLong(6, 1234567890000L)
                    ps.executeUpdate()
                    ps.generatedKeys.use { keys -> assertTrue(keys.next()); assertTrue(keys.getLong(1) > 0) }
                }
                conn.prepareStatement("UPDATE account_characters SET muted_until=? WHERE id=?").use { ps ->
                    ps.setTimestamp(1, Timestamp(1234567890000L)); ps.setInt(2, characterId); ps.executeUpdate()
                }
            }
            val repo = CentralActivityLogRepository(ds)
            val log = CentralActivityLog.Login(255, 1234567890000L, characterId, accountId)
            val uuid = repo.insert(log)
            assertEquals(log, repo.findByLogUuid(uuid)!!.toCentralActivityLog())
            val notifications = mutableListOf<String?>()
            val handler = object : PgNotifyHandler { override fun handle(payload: String?) { notifications.add(payload) } }
            val service = PgNotifyService(ds, mapOf("character_display_name_events" to handler, "character_mute_events" to handler))
            service.poll()
            assertTrue(notifications.any { it?.contains("Tester") == true })
            assertTrue(notifications.any { it?.contains("1234567890000") == true })
            ds.connection.use { conn ->
                conn.createStatement().use { st ->
                    st.executeQuery("SELECT count(*) FROM notification_outbox").use { rs -> rs.next(); assertEquals(0, rs.getInt(1)) }
                }
            }
        }
        DataSourceFactory.create(config).use { ds ->
            FlywayMigrator.migrate(ds)
            assertEquals(accountId, AccountRepository(ds).findByUsername("tester")!!.id)
            ds.connection.use { conn ->
                conn.createStatement().use { st ->
                    st.executeQuery("SELECT count FROM inventory_objs").use { rs -> assertTrue(rs.next()); assertEquals(750, rs.getInt(1)) }
                    st.executeQuery("SELECT base_level FROM stats").use { rs -> assertTrue(rs.next()); assertEquals(43, rs.getInt(1)) }
                    st.executeQuery("SELECT muted_until FROM account_characters").use { rs -> assertTrue(rs.next()); assertEquals(1234567890000L, rs.getTimestamp(1).time) }
                    st.execute("DELETE FROM accounts WHERE id=$accountId")
                    st.executeQuery("SELECT count(*) FROM inventory_objs").use { rs -> rs.next(); assertEquals(0, rs.getInt(1)) }
                }
            }
        }
    }

    @Test
    fun `rolled back writes do not deliver notifications`() {
        val config = CentralConfig(jdbc = JdbcConfig("jdbc:sqlite:${directory.resolve("rollback.db")}"))
        DataSourceFactory.create(config).use { ds ->
            FlywayMigrator.migrate(ds)
            ds.connection.use { conn ->
                conn.autoCommit = false
                conn.createStatement().use { it.execute("INSERT INTO accounts(account_name,password_hash,discord_id) VALUES ('test','hash','123')") }
                conn.rollback()
            }
            ds.connection.use { conn ->
                conn.createStatement().use { st ->
                    st.executeQuery("SELECT count(*) FROM accounts").use { rs -> rs.next(); assertEquals(0, rs.getInt(1)) }
                    st.executeQuery("SELECT count(*) FROM notification_outbox").use { rs -> rs.next(); assertEquals(0, rs.getInt(1)) }
                }
            }
        }
    }
}
