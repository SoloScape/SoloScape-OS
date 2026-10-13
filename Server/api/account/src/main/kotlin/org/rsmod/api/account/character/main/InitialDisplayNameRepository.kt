package org.rsmod.api.account.character.main

import dev.or2.central.account.AccountNameAuthPolicy
import dev.or2.central.display.DisplayNameFormatResult
import dev.or2.central.display.DisplayNamePolicy
import dev.or2.sql.OpenRuneSql
import jakarta.inject.Inject
import org.rsmod.api.db.jdbc.GameDatabase

public class InitialDisplayNameRepository @Inject constructor(private val database: GameDatabase) {
    private val badWords by lazy {
        AccountNameAuthPolicy.parseBadWordLines(
            listOf("profanity/bad_words_local.txt", "profanity/bad_words_custom.txt")
                .joinToString("\n") { path ->
                    javaClass.classLoader.getResourceAsStream(path)
                        ?.bufferedReader()?.use { it.readText() }.orEmpty()
                }
        )
    }

    public fun valid(name: String): Boolean =
        name == DisplayNamePolicy.sanitize(name) &&
            DisplayNamePolicy.validateFormat(name, badWords) == DisplayNameFormatResult.Ok

    public fun available(name: String): Boolean {
        if (!valid(name)) return false
        return database.withTransactionBlocking { connection ->
            connection.prepareStatement(OpenRuneSql.text("game/character/display_name_available.sql"))
                .use { statement ->
                    statement.setString(1, name)
                    statement.setString(2, name)
                    statement.setLong(3, System.currentTimeMillis())
                    statement.executeQuery().use { it.next() && it.getBoolean(1) }
                }
        }
    }

    public fun claim(characterId: Int, accountId: Int, name: String): Boolean {
        if (!valid(name)) return false
        return database.withTransactionBlocking { connection ->
            connection.prepareStatement(
                OpenRuneSql.text("game/character/display_name_claim_initial.sql")
            ).use { statement ->
                statement.setString(1, name)
                statement.setInt(2, characterId)
                statement.setInt(3, accountId)
                statement.setString(4, name)
                statement.setString(5, name)
                statement.setLong(6, System.currentTimeMillis())
                statement.executeUpdate() == 1
            }
        }
    }
}
