SELECT NOT EXISTS (
    SELECT 1 FROM account_characters WHERE lower(trim(display_name)) = lower(trim(?))
) AND NOT EXISTS (
    SELECT 1 FROM display_name_holds
    WHERE lower(trim(held_name)) = lower(trim(?)) AND release_at > ?
)
