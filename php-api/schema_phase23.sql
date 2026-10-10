-- HeritOS: Phase 23 migration (Phase 3 appointments). Additive; safe to re-run.
-- Import via phpMyAdmin AFTER schema_phase22.sql (see docs/DEPLOYMENT.md).
--
-- 1. appointments, appointment_events, availability_blocks and booking_lock
--    (the single-owner serialisation row that every reservation locks).
-- 2. Old tailoring_orders.fitting_date values become all-day fitting
--    appointments (owner decision, 10 October 2026): today or later in Lagos is
--    'confirmed'; earlier is 'completed' history; nothing is deleted. A fitting
--    on a cancelled job is migrated as 'cancelled'. All-day appointments never
--    block timed slots. fitting_date stays as a cache of the next fitting.
-- 3. Phase 3 settings defaults. Availability (hours, breaks, buffer, durations,
--    notice, horizon, hold) is deliberately NOT seeded: no public slots exist
--    until the owner fills it in. Public requests start switched off.
--
-- DRY RUN FIRST and record the counts in the release notes:
--   SELECT COUNT(*) AS fittings,
--          SUM(fitting_date >= DATE(UTC_TIMESTAMP() + INTERVAL 1 HOUR)) AS upcoming
--     FROM tailoring_orders WHERE fitting_date IS NOT NULL AND deleted_at IS NULL;
-- All DATETIME columns hold UTC. Africa/Lagos is UTC+1 all year (no daylight saving).

CREATE TABLE IF NOT EXISTS appointments (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type             ENUM('consultation','fitting','collection') NOT NULL,
  status           ENUM('requested','confirmed','completed','cancelled','no_show','expired') NOT NULL,
  starts_at        DATETIME NOT NULL,                 -- UTC
  ends_at          DATETIME NOT NULL,                 -- UTC
  all_day          TINYINT(1) NOT NULL DEFAULT 0,
  buffer_min       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  customer_id      INT UNSIGNED NULL,
  job_id           INT UNSIGNED NULL,
  enquiry_id       INT UNSIGNED NULL,
  contact_name     VARCHAR(160) NULL,
  contact_phone    VARCHAR(40) NULL,
  contact_email    VARCHAR(190) NULL,
  source           ENUM('owner','public','portal','migration') NOT NULL,
  hold_expires_at  DATETIME NULL,                     -- UTC; only for 'requested'
  override_reason  VARCHAR(255) NULL,
  notes_internal   TEXT NULL,
  client_note      VARCHAR(500) NULL,
  request_key      VARCHAR(64) NULL,
  created_by       INT UNSIGNED NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_request_key (request_key),
  KEY idx_active (status, starts_at),
  KEY idx_job (job_id),
  KEY idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointment_events (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id  INT UNSIGNED NOT NULL,
  from_status     VARCHAR(12) NULL,
  to_status       VARCHAR(12) NULL,
  from_starts_at  DATETIME NULL,                      -- UTC
  to_starts_at    DATETIME NULL,                      -- UTC
  reason          VARCHAR(255) NULL,
  actor_type      ENUM('owner','customer','system') NOT NULL,
  actor_id        INT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_appointment (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Closed dates, leave and other time the owner is not available.
CREATE TABLE IF NOT EXISTS availability_blocks (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  starts_at   DATETIME NOT NULL,                      -- UTC
  ends_at     DATETIME NOT NULL,                      -- UTC
  reason      VARCHAR(160) NULL,
  created_by  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_range (starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row. Every reservation runs SELECT ... FOR UPDATE on it, so two requests
-- for the same time are decided one after the other (released at COMMIT).
CREATE TABLE IF NOT EXISTS booking_lock (
  id          TINYINT UNSIGNED NOT NULL,
  touched_at  DATETIME NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO booking_lock (id) VALUES (1);

-- ── 2. Fitting dates become all-day fitting appointments ─────────────────────
-- request_key 'migr-fitting-<job id>' makes a second run a no-op.
INSERT IGNORE INTO appointments
  (type, status, starts_at, ends_at, all_day, customer_id, job_id, source, request_key, notes_internal)
SELECT 'fitting',
       CASE WHEN COALESCE(job_stage, '') = 'cancelled' OR stage = 'cancelled' THEN 'cancelled'
            WHEN fitting_date >= DATE(UTC_TIMESTAMP() + INTERVAL 1 HOUR) THEN 'confirmed'
            ELSE 'completed' END,
       TIMESTAMP(fitting_date) - INTERVAL 1 HOUR,     -- Lagos midnight in UTC
       TIMESTAMP(fitting_date) + INTERVAL 23 HOUR,
       1, customer_id, id, 'migration', CONCAT('migr-fitting-', id),
       IF(fitting_date >= DATE(UTC_TIMESTAMP() + INTERVAL 1 HOUR),
          'Migrated from the old fitting date (phase 23); time not recorded',
          'Migrated from the old fitting date (phase 23); outcome unknown')
  FROM tailoring_orders
 WHERE fitting_date IS NOT NULL AND deleted_at IS NULL;

INSERT INTO appointment_events (appointment_id, from_status, to_status, to_starts_at, reason, actor_type)
SELECT a.id, NULL, a.status, a.starts_at, 'Migrated from tailoring_orders.fitting_date (phase 23)', 'system'
  FROM appointments a
 WHERE a.source = 'migration'
   AND NOT EXISTS (SELECT 1 FROM appointment_events e WHERE e.appointment_id = a.id);

-- ── 3. Settings defaults (owner decisions, 10 October 2026) ──────────────────
INSERT IGNORE INTO settings (skey, svalue) VALUES
  ('public_booking_enabled', '0');
