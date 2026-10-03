UPDATE account_characters
SET online_central_world_id = ?, online_session_heartbeat = (CAST(unixepoch('subsec') * 1000 AS INTEGER))
WHERE id = ?
