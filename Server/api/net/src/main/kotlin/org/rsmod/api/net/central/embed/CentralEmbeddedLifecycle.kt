package org.rsmod.api.net.central.embed

import dev.or2.central.auth.PasswordAuthConfig
import dev.or2.central.embed.OpenRuneCentralEmbeddedServer
import dev.or2.central.util.config.centralRuntimeConfigFromJdbc
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.rsmod.api.db.DatabaseConfig
import org.rsmod.api.net.central.OpenRuneCentralWorldLink
import org.rsmod.api.server.config.ServerConfig

@Singleton
public class CentralEmbeddedLifecycle
@Inject
constructor(
    private val serverConfig: ServerConfig,
    private val openRuneCentral: OpenRuneCentralWorldLink,
) {
    private var server: OpenRuneCentralEmbeddedServer? = null

    public fun startIfConfigured() {
        val c = serverConfig.central ?: return
        if (!c.sameInstance) {
            return
        }
        val db = DatabaseConfig.create(serverConfig.copy(database = null))

        fun buildRuntime() =
            centralRuntimeConfigFromJdbc(
                jdbcUrl = db.jdbcUrl,
                dbUser = db.user,
                dbPassword = db.password,
                dbMaximumPoolSize = c.sqlite.poolSize,
                worldLinkPort = c.linkPort,
                httpPort = c.httpPort,
                serverName = serverConfig.name,
                worldLinkSoBacklog = 512,
                loginTimingLogs = serverConfig.loginTimingLogs,
                socialPmTraceLogs = serverConfig.socialPmTraceLogs,
            )

        val runtime = buildRuntime()
        openRuneCentral.applyPasswordAuth(
            PasswordAuthConfig(
                passwordHasher = runtime.auth.passwordHasher,
                bcryptCost = runtime.auth.bcryptCost,
                argon2Iterations = runtime.auth.argon2Iterations,
                argon2MemoryKib = runtime.auth.argon2MemoryKib,
            ),
        )

        val centralServer = OpenRuneCentralEmbeddedServer(c.httpPort, runtime)
        try {
            centralServer.start()
            server = centralServer
        } catch (t: Throwable) {
            runCatching { centralServer.stop() }
            throw t
        }
    }

    public fun stopIfRunning() {
        server?.stop()
        server = null
    }
}
