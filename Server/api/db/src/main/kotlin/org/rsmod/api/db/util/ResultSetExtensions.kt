package org.rsmod.api.db.util

import java.sql.ResultSet
import java.time.LocalDateTime

public fun ResultSet.getLocalDateTime(columnLabel: String): LocalDateTime? {
    return getTimestamp(columnLabel)?.toLocalDateTime()
}

public fun ResultSet.getStringOrNull(columnLabel: String): String? {
    return getString(columnLabel).takeUnless { wasNull() }
}

public fun ResultSet.getIntOrNull(columnLabel: String): Int? {
    return getInt(columnLabel).takeUnless { wasNull() }
}
