UPDATE account_characters
SET x = ?, z = ?, level = ?, last_login = ?, run_energy = ?,
    xp_rate_in_hundreds = ?, display_name = ?,
    members = ?, online_central_world_id = ?, online_session_heartbeat = (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
    last_logout = (CAST(unixepoch('subsec') * 1000 AS INTEGER))
WHERE id = ?
