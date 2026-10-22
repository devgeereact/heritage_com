-- HeritOS: Phase 31 migration (Phase 7 of the 2026 plan: section usage counts).
-- Additive; safe to re-run. Import via phpMyAdmin AFTER schema_phase30.sql.
--
-- 1. usage_daily: how many times each admin section was opened per Lagos day
--    and staff role. The browser sends at most one count per section per day
--    (usage.php?action=hit). No user id, no IP address and no path beyond the
--    section key are stored (docs/DATA-PRIVACY.md).
-- 2. The retention setting for it (retention_usage_daily_days). Empty means
--    keep forever, like every other category; the owner chooses a period.
--
-- Dry run (read-only), record the result before importing:
--   SHOW TABLES LIKE 'usage_daily';
--   SELECT skey, svalue FROM settings WHERE skey = 'retention_usage_daily_days';

CREATE TABLE IF NOT EXISTS usage_daily (
  day      DATE NOT NULL,                 -- Africa/Lagos date of the visit
  section  VARCHAR(40) NOT NULL,          -- menu section key (USAGE_SECTIONS in _review.php)
  role     VARCHAR(20) NOT NULL,          -- staff role at the time, never a person
  hits     INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, section, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings (skey, svalue) VALUES
  ('retention_usage_daily_days', '');
