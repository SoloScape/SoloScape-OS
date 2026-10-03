WITH RECURSIVE names(name) AS (
    SELECT account_name FROM accounts
    UNION ALL
    SELECT display_name FROM account_characters WHERE display_name IS NOT NULL
), normalized(rest, collision_key) AS (
    SELECT lower(trim(name)), '' FROM names
    UNION ALL
    SELECT substr(rest, 2), collision_key ||
        CASE WHEN substr(rest, 1, 1) GLOB '[a-z0-9]' THEN substr(rest, 1, 1) ELSE '' END
    FROM normalized WHERE rest <> ''
)
SELECT 1 FROM normalized
WHERE rest = '' AND collision_key = ? AND length(collision_key) > 0
LIMIT 1
