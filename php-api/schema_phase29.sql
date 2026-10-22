-- HeritOS: Phase 29 migration (staff password reset by email, K-04).
-- Additive; safe to re-run. Import via phpMyAdmin AFTER schema_phase28.sql.
--
-- 1. password_resets: one row per reset link sent to a staff member. Only the
--    SHA-256 hash of the link token is stored, never the token. A link works
--    once (used_at) and expires (expires_at, UTC; 30 minutes by default,
--    RESET_TTL_MINUTES in config.php). Asking for a new link retires every
--    earlier unused one. A successful reset signs the person out everywhere.
--
-- Dry run (read-only), record the result before importing:
--   SHOW TABLES LIKE 'password_resets';

CREATE TABLE IF NOT EXISTS password_resets (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,                    -- UTC
  used_at     DATETIME NULL,                        -- UTC; set when used or retired
  ip          VARCHAR(45) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_password_resets_hash (token_hash),
  KEY idx_password_resets_user (user_id, used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
