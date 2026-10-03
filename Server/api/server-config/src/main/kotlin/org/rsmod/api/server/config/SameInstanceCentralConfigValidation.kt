package org.rsmod.api.server.config

import java.nio.file.Path

public object SameInstanceCentralConfigValidation {
    public fun validateAfterLoad(configFile: Path, config: ServerConfig) {
        val urls = listOfNotNull(config.database?.sqlite?.jdbcUrl, config.central?.sqlite?.jdbcUrl)
        require(urls.all { it.startsWith("jdbc:sqlite:") }) {
            "${configFile.toAbsolutePath()}: database.sqlite and central.sqlite require SQLite JDBC URLs."
        }
    }
}
