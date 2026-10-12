INSERT INTO account_characters (account_id, display_name, x, z, level)
VALUES (?, (SELECT account_name FROM accounts WHERE id = ?), 3094, 3107, 0)
