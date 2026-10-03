SELECT reboot_at, created_at
FROM world_reboot_schedules
WHERE status = 'active'
  AND reboot_at > (CAST(unixepoch('subsec') * 1000 AS INTEGER))
  AND (world_id IS NULL OR world_id = ?)
