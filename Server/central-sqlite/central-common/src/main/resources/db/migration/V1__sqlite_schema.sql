CREATE TABLE IF NOT EXISTS realms (
    realm_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    login_message TEXT,
    login_broadcast TEXT,
    spawn_coord TEXT NOT NULL DEFAULT '0_50_50_21_18',
    respawn_coord TEXT NOT NULL DEFAULT '0_50_50_21_18',
    dev_mode INTEGER NOT NULL DEFAULT 0, -- when 1: LOGIN_OK always ADMIN (gates still use accounts.rights)
    require_registration INTEGER NOT NULL DEFAULT 1,
    auto_assign_display_names INTEGER NOT NULL DEFAULT 0,
    player_xp_rate_in_hundreds INTEGER NOT NULL DEFAULT 100,
    global_xp_rate_in_hundreds INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS worlds (
    world_id INTEGER PRIMARY KEY,
    flags TEXT NOT NULL DEFAULT '',
    host TEXT NOT NULL,
    activity TEXT NOT NULL,
    location INTEGER NOT NULL DEFAULT 0,
    population INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    max_players INTEGER NULL,
    world_key_sha256 BLOB NULL,
    realm_id INTEGER NOT NULL REFERENCES realms (realm_id),
    login_restrictions_enabled INTEGER NOT NULL DEFAULT 0,
    login_min_total_level INTEGER NOT NULL DEFAULT 0,
    login_min_rights_token TEXT NULL,
    login_gate_min_level_enabled INTEGER NOT NULL DEFAULT 0,
    login_gate_rights_enabled INTEGER NOT NULL DEFAULT 0,
    login_gate_whitelist_enabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS world_login_whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_id INTEGER NOT NULL REFERENCES worlds (world_id) ON DELETE CASCADE,
    account_name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_world_login_whitelist_world_account_lower ON world_login_whitelist (world_id, lower(account_name));
CREATE INDEX IF NOT EXISTS idx_world_login_whitelist_world ON world_login_whitelist (world_id);

UPDATE worlds AS w
SET
    login_gate_min_level_enabled = CASE WHEN w.login_min_total_level > 0 THEN 1 ELSE 0 END,
    login_gate_rights_enabled =
        CASE
            WHEN w.login_min_rights_token IS NOT NULL AND trim(w.login_min_rights_token) <> '' THEN 1
            ELSE 0
        END,
    login_gate_whitelist_enabled =
        CASE
            WHEN EXISTS (SELECT 1 FROM world_login_whitelist wl WHERE wl.world_id = w.world_id) THEN 1
            ELSE 0
        END
WHERE
    w.login_restrictions_enabled <> 0
    AND (
        w.login_gate_min_level_enabled = 0
        AND w.login_gate_rights_enabled = 0
        AND w.login_gate_whitelist_enabled = 0
    );

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    rights TEXT NOT NULL DEFAULT '',
    email TEXT,
    twofa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    twofa_secret TEXT,
    twofa_last_verified INTEGER,
    known_device INTEGER,
    created_at INTEGER DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
    updated_at INTEGER DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_account_name_lower ON accounts ((lower(account_name)));

CREATE TABLE IF NOT EXISTS account_characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    display_name TEXT,
    members BOOLEAN NOT NULL DEFAULT FALSE,
    world_id INTEGER,
    x INTEGER NOT NULL DEFAULT 3200,
    z INTEGER NOT NULL DEFAULT 3200,
    level INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
    last_login INTEGER,
    last_logout INTEGER,
    muted_until INTEGER,
    banned_until INTEGER,
    run_energy INTEGER NOT NULL DEFAULT 10000,
    xp_rate_in_hundreds INTEGER NOT NULL DEFAULT 100,
    online_central_world_id INTEGER NULL,
    online_session_heartbeat INTEGER NULL,
    FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE,
    FOREIGN KEY (world_id) REFERENCES worlds (world_id)
);

CREATE INDEX IF NOT EXISTS idx_account_characters_account_id ON account_characters (account_id);

-- NOTIFY when `account_characters.muted_until` changes (Central LISTEN â†’ world-link OP_SERVER_MUTE_UPDATE).




-- Reserved display names after a rename (others cannot take the name until release_at).
-- Case-sensitive held_name matches account_characters.display_name uniqueness rules.
CREATE TABLE IF NOT EXISTS display_name_holds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    held_name TEXT NOT NULL,
    release_at INTEGER NOT NULL,
    source_character_id INTEGER NULL REFERENCES account_characters (id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
);

CREATE INDEX IF NOT EXISTS idx_display_name_holds_release_at ON display_name_holds (release_at);

CREATE TABLE IF NOT EXISTS character_varps (
    character_id INTEGER NOT NULL REFERENCES account_characters (id) ON DELETE CASCADE,
    varp TEXT NOT NULL,
    value INTEGER NOT NULL,
    PRIMARY KEY (character_id, varp)
);

CREATE INDEX IF NOT EXISTS idx_character_varps_character ON character_varps (character_id);

CREATE TABLE IF NOT EXISTS character_attrs (
    character_id INTEGER NOT NULL REFERENCES account_characters (id) ON DELETE CASCADE,
    attr TEXT NOT NULL,
    value_json TEXT NOT NULL,
    PRIMARY KEY (character_id, attr)
);

CREATE INDEX IF NOT EXISTS idx_character_attrs_character ON character_attrs (character_id);

CREATE TABLE IF NOT EXISTS stats (
    character_id INTEGER NOT NULL,
    stat_id INTEGER NOT NULL,
    vis_level INTEGER NOT NULL,
    base_level INTEGER NOT NULL,
    fine_xp INTEGER NOT NULL,
    updated_at INTEGER DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
    FOREIGN KEY (character_id) REFERENCES account_characters (id) ON DELETE CASCADE,
    UNIQUE (character_id, stat_id)
);

CREATE INDEX IF NOT EXISTS idx_stats_character_id ON stats (character_id);

CREATE TABLE IF NOT EXISTS inventories (
    character_id INTEGER NOT NULL,
    inv TEXT NOT NULL,
    PRIMARY KEY (character_id, inv),
    FOREIGN KEY (character_id) REFERENCES account_characters (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventories_character_id ON inventories (character_id);

CREATE TABLE IF NOT EXISTS inventory_objs (
    character_id INTEGER NOT NULL,
    inv TEXT NOT NULL,
    slot INTEGER NOT NULL,
    obj TEXT NOT NULL,
    count INTEGER NOT NULL,
    vars INTEGER NOT NULL,
    PRIMARY KEY (character_id, inv, slot),
    FOREIGN KEY (character_id, inv) REFERENCES inventories (character_id, inv) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    world_id INTEGER NOT NULL REFERENCES worlds (world_id),
    character_id INTEGER NULL REFERENCES account_characters (id) ON DELETE SET NULL,
    token_hash BLOB NOT NULL UNIQUE,
    created_at BIGINT NOT NULL,
    last_seen_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions (account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_world ON sessions (world_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions (last_seen_at);

CREATE TABLE IF NOT EXISTS world_reboot_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
    world_id INTEGER NULL REFERENCES worlds (world_id) ON DELETE CASCADE,
    reboot_at INTEGER NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL DEFAULT 'admin-web',
    cancelled_at INTEGER NULL,
    CONSTRAINT chk_world_reboot_status CHECK (status IN ('active', 'cancelled', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_world_reboot_active ON world_reboot_schedules (status, reboot_at)
    WHERE status = 'active';

CREATE TABLE IF NOT EXISTS world_broadcast_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
    world_id INTEGER NULL REFERENCES worlds (world_id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL DEFAULT 'admin-web'
);









CREATE TABLE IF NOT EXISTS punishments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT NOT NULL,
    account_id INTEGER NULL REFERENCES accounts (id) ON DELETE CASCADE,
    character_id INTEGER NULL REFERENCES account_characters (id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    issued_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
    expires_at INTEGER NULL,
    reason TEXT NOT NULL DEFAULT '',
    private_notes TEXT NULL,
    public_notes TEXT NULL,
    issued_by TEXT NOT NULL,
    approved_by TEXT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    repo_link_uuid TEXT NULL,
    CONSTRAINT chk_punishments_scope_fk CHECK (
        (scope = 'account' AND account_id IS NOT NULL AND character_id IS NULL)
        OR (scope = 'character' AND character_id IS NOT NULL AND account_id IS NULL)
    ),
    CONSTRAINT chk_punishments_scope_value CHECK (scope IN ('account', 'character')),
    CONSTRAINT chk_punishments_kind CHECK (
        kind IN ('ban', 'temp_ban', 'mute', 'temp_mute', 'locked', 'kick')
    ),
    CONSTRAINT chk_punishments_status CHECK (status IN ('active', 'inactive', 'squashed')),
    CONSTRAINT chk_punishments_kick_scope CHECK (kind <> 'kick' OR scope IN ('account', 'character')),
    CONSTRAINT chk_punishments_locked_scope CHECK (kind <> 'locked' OR scope IN ('account', 'character'))
);

CREATE INDEX IF NOT EXISTS idx_punishments_account ON punishments (account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_punishments_character ON punishments (character_id) WHERE character_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_punishments_status_issued ON punishments (status, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_punishments_expires ON punishments (expires_at) WHERE expires_at IS NOT NULL;









CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_uuid TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    log_type TEXT NOT NULL,
    occurred_at BIGINT NOT NULL, -- epoch millis, UTC instant
    account_id INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    -- 0 = no character row (lobby login). No FK so sentinel 0 is valid.
    character_id INTEGER NOT NULL DEFAULT 0,
    world_id INTEGER NULL REFERENCES worlds (world_id) ON DELETE SET NULL,
    payload TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_logs_log_uuid ON activity_logs (log_uuid);

CREATE INDEX IF NOT EXISTS idx_activity_logs_type_time
    ON activity_logs (log_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_character_time
    ON activity_logs (character_id, occurred_at DESC)
    WHERE character_id > 0;

CREATE INDEX IF NOT EXISTS idx_activity_logs_world_time
    ON activity_logs (world_id, occurred_at DESC)
    WHERE world_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_account_time
    ON activity_logs (account_id, occurred_at DESC);

-- Point-in-time online counts per world (sampled on an interval, separate from activity logs).
CREATE TABLE IF NOT EXISTS online_samples (
    sampled_at BIGINT NOT NULL, -- epoch millis, UTC instant
    world_id INTEGER NOT NULL REFERENCES worlds (world_id) ON DELETE CASCADE,
    online_count INTEGER NOT NULL CHECK (online_count >= 0),
    PRIMARY KEY (sampled_at, world_id)
);

CREATE INDEX IF NOT EXISTS idx_online_samples_world_time
    ON online_samples (world_id, sampled_at DESC);

CREATE INDEX IF NOT EXISTS idx_online_samples_time
    ON online_samples (sampled_at DESC);

-- Links activity log rows to any subject (punishments, tickets, etc.) via (subject_type, subject_id).
-- Must run after `activity_logs` exists (09).
CREATE TABLE IF NOT EXISTS activity_log_attachments (
    subject_type TEXT NOT NULL,
    subject_id BIGINT NOT NULL,
    log_uuid TEXT NOT NULL REFERENCES activity_logs (log_uuid) ON DELETE CASCADE,
    PRIMARY KEY (subject_type, subject_id, log_uuid)
);

CREATE INDEX IF NOT EXISTS idx_activity_log_attachments_log_uuid ON activity_log_attachments (log_uuid);

CREATE INDEX IF NOT EXISTS idx_activity_log_attachments_subject ON activity_log_attachments (subject_type, subject_id);

-- Pivot for item lines on trade and single-item move logs. Query by item_id without scanning JSON payload.
CREATE TABLE IF NOT EXISTS activity_log_items (
    activity_log_id BIGINT NOT NULL REFERENCES activity_logs (id) ON DELETE CASCADE,
    slot_key TEXT NOT NULL CHECK (
        slot_key IN (
            'trade_initiated',
            'trade_receiving',
            'pickup_item',
            'dropped_item',
            'destroy_item'
        )
    ),
    line_index SMALLINT NOT NULL CHECK (line_index >= 0),
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (activity_log_id, slot_key, line_index)
);

CREATE INDEX IF NOT EXISTS idx_activity_log_items_item_time
    ON activity_log_items (item_id, activity_log_id DESC);

CREATE TABLE IF NOT EXISTS character_friends (
                                                 owner_character_id INTEGER NOT NULL REFERENCES account_characters (id) ON DELETE CASCADE,
    friend_character_id INTEGER NOT NULL REFERENCES account_characters (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
    PRIMARY KEY (owner_character_id, friend_character_id),
    CONSTRAINT chk_character_friends_not_self CHECK (owner_character_id <> friend_character_id)
    );

CREATE INDEX IF NOT EXISTS idx_character_friends_friend
    ON character_friends (friend_character_id);

CREATE TABLE IF NOT EXISTS character_ignores (
                                                 owner_character_id INTEGER NOT NULL REFERENCES account_characters (id) ON DELETE CASCADE,
    ignored_character_id INTEGER NOT NULL REFERENCES account_characters (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
    PRIMARY KEY (owner_character_id, ignored_character_id),
    CONSTRAINT chk_character_ignores_not_self CHECK (owner_character_id <> ignored_character_id)
    );

CREATE INDEX IF NOT EXISTS idx_character_ignores_ignored
    ON character_ignores (ignored_character_id);

CREATE TABLE IF NOT EXISTS character_chat_filters (
                                                      character_id INTEGER PRIMARY KEY REFERENCES account_characters (id) ON DELETE CASCADE,
    public_chat INTEGER NOT NULL DEFAULT 0,
    private_chat INTEGER NOT NULL DEFAULT 0,
    trade_chat INTEGER NOT NULL DEFAULT 0
    );
-- Laravel Fortify 2FA columns (website-compatible) and per-account trusted devices.
ALTER TABLE accounts ADD COLUMN two_factor_secret TEXT;
ALTER TABLE accounts ADD COLUMN two_factor_recovery_codes TEXT;
ALTER TABLE accounts ADD COLUMN two_factor_confirmed_at INTEGER;



CREATE TABLE IF NOT EXISTS account_trusted_devices (
    account_id INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    device_id INTEGER NOT NULL,
    verified_at INTEGER NOT NULL,
    PRIMARY KEY (account_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_account_trusted_devices_account_id ON account_trusted_devices (account_id);

INSERT INTO account_trusted_devices (account_id, device_id, verified_at)
SELECT id, known_device, COALESCE(twofa_last_verified, (CAST(unixepoch('subsec') * 1000 AS INTEGER)))
FROM accounts
WHERE known_device IS NOT NULL
ON CONFLICT (account_id, device_id) DO NOTHING;

ALTER TABLE accounts DROP COLUMN twofa_enabled;
ALTER TABLE accounts DROP COLUMN twofa_secret;
ALTER TABLE accounts DROP COLUMN twofa_last_verified;
ALTER TABLE accounts DROP COLUMN known_device;

ALTER TABLE accounts ADD COLUMN discord_id TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_discord_id ON accounts (discord_id) WHERE discord_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS discord_link_pending (
    account_id INTEGER PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
    discord_user_id TEXT NOT NULL,
    code INTEGER NOT NULL,
    wrong_attempts INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_discord_link_pending_discord_user
    ON discord_link_pending (discord_user_id);

CREATE INDEX IF NOT EXISTS idx_discord_link_pending_expires ON discord_link_pending (expires_at);






ALTER TABLE account_characters ADD COLUMN previous_display_name TEXT;
ALTER TABLE account_characters ADD COLUMN display_name_changed_at BIGINT;
CREATE UNIQUE INDEX uq_account_characters_display_name_lower ON account_characters(lower(trim(display_name))) WHERE display_name IS NOT NULL AND trim(display_name) <> '';
CREATE UNIQUE INDEX uq_display_name_holds_held_name_lower ON display_name_holds(lower(trim(held_name))) WHERE trim(held_name) <> '';
CREATE TABLE notification_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, payload TEXT NOT NULL);

CREATE TRIGGER character_mute_insert AFTER INSERT ON account_characters
WHEN NEW.muted_until IS NOT NULL
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('character_mute_events', json_object('account_id', NEW.account_id, 'character_id', NEW.id, 'muted_until_epoch_millis', CAST(COALESCE(NEW.muted_until,0) AS TEXT)));
END;

CREATE TRIGGER character_name_insert AFTER INSERT ON account_characters
WHEN NEW.display_name IS NOT NULL
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('character_display_name_events', json_object('account_id', CAST(NEW.account_id AS TEXT), 'character_id', CAST(NEW.id AS TEXT), 'display_name', COALESCE(NEW.display_name,''), 'previous_display_name', ''));
END;

CREATE TRIGGER account_discord_insert AFTER INSERT ON accounts
WHEN NEW.discord_id IS NOT NULL
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('account_discord_id_events', json_object('account_id', CAST(NEW.id AS TEXT), 'discord_id', COALESCE(NEW.discord_id,'')));
END;

CREATE TRIGGER punishment_ban_insert AFTER INSERT ON punishments
WHEN NEW.status='active' AND NEW.kind IN ('ban','temp_ban','locked') AND (NEW.expires_at IS NULL OR NEW.expires_at > CAST(unixepoch('subsec')*1000 AS INTEGER))
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('punishment_events', json_object('account_id', COALESCE(NEW.account_id,(SELECT account_id FROM account_characters WHERE id=NEW.character_id)), 'character_id', NEW.character_id, 'scope', NEW.scope, 'as_kick', json(CASE WHEN NEW.kind='locked' THEN 'true' ELSE 'false' END)));
END;

CREATE TRIGGER character_mute_update AFTER UPDATE OF muted_until ON account_characters
WHEN NEW.muted_until IS NOT OLD.muted_until
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('character_mute_events', json_object('account_id', NEW.account_id, 'character_id', NEW.id, 'muted_until_epoch_millis', CAST(COALESCE(NEW.muted_until,0) AS TEXT)));
END;

CREATE TRIGGER character_name_update AFTER UPDATE OF display_name ON account_characters
WHEN NEW.display_name IS NOT OLD.display_name
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('character_display_name_events', json_object('account_id', CAST(NEW.account_id AS TEXT), 'character_id', CAST(NEW.id AS TEXT), 'display_name', COALESCE(NEW.display_name,''), 'previous_display_name', COALESCE(OLD.display_name,'')));
END;

CREATE TRIGGER account_discord_update AFTER UPDATE OF discord_id ON accounts
WHEN NEW.discord_id IS NOT OLD.discord_id
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('account_discord_id_events', json_object('account_id', CAST(NEW.id AS TEXT), 'discord_id', COALESCE(NEW.discord_id,'')));
END;

CREATE TRIGGER punishment_ban_update AFTER UPDATE ON punishments
WHEN NEW.status='active' AND NEW.kind IN ('ban','temp_ban','locked') AND (NEW.expires_at IS NULL OR NEW.expires_at > CAST(unixepoch('subsec')*1000 AS INTEGER))
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('punishment_events', json_object('account_id', COALESCE(NEW.account_id,(SELECT account_id FROM account_characters WHERE id=NEW.character_id)), 'character_id', NEW.character_id, 'scope', NEW.scope, 'as_kick', json(CASE WHEN NEW.kind='locked' THEN 'true' ELSE 'false' END)));
END;

CREATE TRIGGER punishment_kick AFTER INSERT ON punishments
WHEN NEW.status='active' AND NEW.kind='kick'
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('punishment_kick_events', json_object('account_id', COALESCE(NEW.account_id,(SELECT account_id FROM account_characters WHERE id=NEW.character_id)), 'character_id', COALESCE(NEW.character_id,0)));
END;

CREATE TRIGGER world_list_insert AFTER INSERT ON worlds

BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('world_list_events', json_object('world_id', NEW.world_id, 'op', 'insert'));
END;

CREATE TRIGGER world_list_update AFTER UPDATE ON worlds

BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('world_list_events', json_object('world_id', NEW.world_id, 'op', 'update'));
END;

CREATE TRIGGER world_list_delete AFTER DELETE ON worlds

BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('world_list_events', json_object('world_id', OLD.world_id, 'op', 'delete'));
END;

CREATE TRIGGER world_reboot_set AFTER INSERT ON world_reboot_schedules
WHEN NEW.status='active'
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('world_reboot_events', json_object('op', 'set', 'schedule_id', NEW.id, 'world_id', NEW.world_id, 'reboot_at_ms', NEW.reboot_at, 'message', NEW.message));
END;

CREATE TRIGGER world_reboot_clear AFTER UPDATE ON world_reboot_schedules
WHEN NEW.status='cancelled' AND OLD.status IS NOT NEW.status
BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('world_reboot_events', json_object('op', 'clear', 'schedule_id', NEW.id, 'world_id', NEW.world_id));
END;

CREATE TRIGGER world_broadcast AFTER INSERT ON world_broadcast_log

BEGIN
    INSERT INTO notification_outbox(channel, payload) VALUES ('world_broadcast_events', json_object('world_id', NEW.world_id, 'message', NEW.message, 'url', NEW.url, 'icon', NEW.icon));
END;
