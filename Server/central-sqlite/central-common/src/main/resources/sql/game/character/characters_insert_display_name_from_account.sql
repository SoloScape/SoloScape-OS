INSERT INTO account_characters (account_id, display_name, x, z, level)
SELECT ?, NULL, 3094, 3107, 0 FROM accounts WHERE id = ?
