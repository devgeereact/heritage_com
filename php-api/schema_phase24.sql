-- HeritOS: Phase 24 migration (Phase 3 verified customer access). Additive;
-- safe to re-run. Import via phpMyAdmin AFTER schema_phase23.sql.
--
-- 1. customer_sessions: portal sessions. Only the sha256 of each token is
--    stored; sessions expire (customer_session_days, default 7) and can be
--    revoked one by one or all at once. The older customer_tokens table (raw
--    tokens from the phone + order code login) is left as it is and is read
--    only while ALLOW_LEGACY_ORDER_CODE_LOOKUP is on.
-- 2. customer_access_challenges: one row per access attempt. A request that
--    matches nobody stores a decoy row (customer_id NULL) so the reply is the
--    same either way. Codes and invite links are stored as hashes only.
-- 3. Settings defaults: session length 7 days; portal quote acceptance and
--    portal measurement view off (owner decisions, 10 October 2026).
--
-- public_ref already exists on orders and tailoring_orders (schema_phase17.sql).

CREATE TABLE IF NOT EXISTS customer_sessions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash    CHAR(64) NOT NULL,
  customer_id   INT UNSIGNED NOT NULL,
  created_via   ENUM('legacy','code','invite') NOT NULL,
  expires_at    DATETIME NOT NULL,                    -- UTC
  revoked_at    DATETIME NULL,                        -- UTC
  last_seen_at  DATETIME NULL,                        -- UTC
  ip            VARCHAR(45) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token_hash (token_hash),
  KEY idx_customer (customer_id),
  KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_access_challenges (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  challenge_hash  CHAR(64) NOT NULL,                  -- sha256 of the challenge or invite token
  customer_id     INT UNSIGNED NULL,                  -- NULL = decoy (no match)
  channel         ENUM('email','manual','invite') NOT NULL,
  code_hash       CHAR(64) NULL,                      -- HMAC of the six-digit code (email only)
  expires_at      DATETIME NOT NULL,                  -- UTC
  used_at         DATETIME NULL,                      -- UTC
  attempts        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  status          ENUM('pending','awaiting_owner','used','expired','locked') NOT NULL DEFAULT 'pending',
  created_by      INT UNSIGNED NULL,                  -- staff user for invites
  ip              VARCHAR(45) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_challenge (challenge_hash),
  KEY idx_customer_status (customer_id, status),
  KEY idx_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings (skey, svalue) VALUES
  ('customer_session_days', '7'),
  ('portal_quote_accept_enabled', '0'),
  ('portal_show_measurements', '0');
