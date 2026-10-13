UPDATE account_characters SET display_name = ?
WHERE id = ? AND account_id = ? AND (display_name IS NULL OR trim(display_name) = '')
AND NOT EXISTS (
    SELECT 1 FROM account_characters WHERE lower(trim(display_name)) = lower(trim(?))
)
AND NOT EXISTS (
    SELECT 1 FROM display_name_holds
    WHERE lower(trim(held_name)) = lower(trim(?)) AND release_at > ?
)
