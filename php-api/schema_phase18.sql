-- HeritOS: Phase 18 migration (Phase 2 daily records, part 1). Additive; safe to
-- re-run. Import via phpMyAdmin AFTER schema_phase17.sql and BEFORE uploading
-- the Phase 2 PHP files (see docs/07-operations/DEPLOYMENT.md).
--
-- 1. Job stages: new job_stage column beside the legacy stage, controlled mapping,
--    the three dates, quantity, money cache columns and lock_version.
-- 2. Timeline: wider stage column plus kind, meta and public on tailoring_events.
-- 3. Clients: client_ref (staff locator, never a credential), phone_tail9 for
--    duplicate warnings, company, preferred contact, communication notes.
-- 4. Enquiry pipeline: new statuses, follow-up and conversion columns.
-- 5. Settings defaults decided by the owner on 10 October 2026.
--
-- DRY RUN FIRST and record the counts in the release notes:
--   SELECT stage, COUNT(*) FROM tailoring_orders WHERE deleted_at IS NULL GROUP BY stage;
--   SELECT status, COUNT(*) FROM enquiries GROUP BY status;
-- The legacy columns (stage, deposit, measurements) are kept, never dropped.

-- ── 2. Timeline (first, because the stage mapping below writes events) ─────────
ALTER TABLE tailoring_events
  MODIFY stage VARCHAR(30) NOT NULL,
  ADD COLUMN IF NOT EXISTS kind   VARCHAR(20) NOT NULL DEFAULT 'stage' AFTER stage,
  ADD COLUMN IF NOT EXISTS meta   JSON NULL AFTER note,
  ADD COLUMN IF NOT EXISTS public TINYINT(1) NOT NULL DEFAULT 0 AFTER meta;

-- ── 1. Jobs ──────────────────────────────────────────────────────────────────
ALTER TABLE tailoring_orders
  ADD COLUMN IF NOT EXISTS job_stage ENUM('quote','confirmed','measurements_approved','in_production','fitting',
                                          'quality_check','ready','handed_over','cancelled') NULL AFTER stage,
  ADD COLUMN IF NOT EXISTS stage_review     TINYINT(1) NOT NULL DEFAULT 0 AFTER job_stage,
  ADD COLUMN IF NOT EXISTS event_date       DATE NULL AFTER due_date,
  ADD COLUMN IF NOT EXISTS next_action      VARCHAR(160) NULL AFTER event_date,
  ADD COLUMN IF NOT EXISTS next_action_date DATE NULL AFTER next_action,
  ADD COLUMN IF NOT EXISTS quantity         SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER garment_type,
  ADD COLUMN IF NOT EXISTS description      VARCHAR(255) NULL AFTER quantity,
  ADD COLUMN IF NOT EXISTS fabric_source    ENUM('client','herit','mixed') NULL AFTER fabric,
  ADD COLUMN IF NOT EXISTS enquiry_id       INT UNSIGNED NULL AFTER customer_id,
  ADD COLUMN IF NOT EXISTS quote_id         INT UNSIGNED NULL AFTER enquiry_id,
  ADD COLUMN IF NOT EXISTS paid_total       DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER deposit,
  ADD COLUMN IF NOT EXISTS payment_state    VARCHAR(12) NOT NULL DEFAULT 'unpaid' AFTER paid_total,
  ADD COLUMN IF NOT EXISTS handed_over_qty  SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER payment_state,
  ADD COLUMN IF NOT EXISTS lock_version     INT UNSIGNED NOT NULL DEFAULT 0 AFTER handed_over_qty,
  ADD KEY IF NOT EXISTS idx_job_stage (job_stage),
  ADD KEY IF NOT EXISTS idx_next_action (next_action_date),
  ADD KEY IF NOT EXISTS idx_enquiry (enquiry_id);

-- Controlled stage mapping. Touches only rows not yet mapped (job_stage IS NULL),
-- so a second run changes nothing. Each mapped row gets a 'migration' event.
--   measure → confirmed · cut/sew/finish → in_production · fitting → fitting
--   done → ready + stage_review (owner confirms whether it was collected)
--   cancelled → cancelled
INSERT INTO tailoring_events (order_id, stage, kind, note, user_id)
SELECT id,
       CASE stage WHEN 'measure' THEN 'confirmed' WHEN 'cut' THEN 'in_production' WHEN 'sew' THEN 'in_production'
                  WHEN 'finish' THEN 'in_production' WHEN 'fitting' THEN 'fitting' WHEN 'done' THEN 'ready'
                  ELSE 'cancelled' END,
       'migration',
       CONCAT('Stage mapped from ''', stage, ''' to ''',
              CASE stage WHEN 'measure' THEN 'confirmed' WHEN 'cut' THEN 'in_production' WHEN 'sew' THEN 'in_production'
                         WHEN 'finish' THEN 'in_production' WHEN 'fitting' THEN 'fitting' WHEN 'done' THEN 'ready'
                         ELSE 'cancelled' END,
              ''' (phase 18)', IF(stage = 'done', '. Please confirm: ready or already collected?', '')),
       NULL
  FROM tailoring_orders WHERE job_stage IS NULL;

UPDATE tailoring_orders
   SET stage_review = IF(stage = 'done', 1, 0),
       job_stage = CASE stage WHEN 'measure' THEN 'confirmed' WHEN 'cut' THEN 'in_production' WHEN 'sew' THEN 'in_production'
                              WHEN 'finish' THEN 'in_production' WHEN 'fitting' THEN 'fitting' WHEN 'done' THEN 'ready'
                              ELSE 'cancelled' END
 WHERE job_stage IS NULL;

-- ── 3. Clients ───────────────────────────────────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS client_ref        VARCHAR(16) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS phone_tail9       CHAR(9) NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS company_name      VARCHAR(160) NULL AFTER email,
  ADD COLUMN IF NOT EXISTS preferred_contact ENUM('whatsapp','phone','email') NULL AFTER company_name,
  ADD COLUMN IF NOT EXISTS comm_notes        VARCHAR(255) NULL AFTER preferred_contact,
  ADD UNIQUE KEY IF NOT EXISTS uniq_client_ref (client_ref),
  ADD KEY IF NOT EXISTS idx_phone_tail9 (phone_tail9);

UPDATE customers SET client_ref = CONCAT('CL-', LPAD(id, 5, '0')) WHERE client_ref IS NULL;
UPDATE customers
   SET phone_tail9 = RIGHT(REGEXP_REPLACE(phone, '[^0-9]', ''), 9)
 WHERE phone_tail9 IS NULL AND CHAR_LENGTH(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '')) >= 7;

-- ── 4. Enquiry pipeline ──────────────────────────────────────────────────────
-- 'contacted' stays in the list as a legacy alias; the API maps it to
-- 'awaiting_reply' on every write. `company` already exists (schema_phase17.sql).
ALTER TABLE enquiries
  MODIFY status ENUM('new','contacted','awaiting_reply','quote_sent','accepted','closed') NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS quantity       SMALLINT UNSIGNED NULL AFTER interest,
  ADD COLUMN IF NOT EXISTS desired_date   DATE NULL AFTER quantity,
  ADD COLUMN IF NOT EXISTS next_follow_up DATE NULL AFTER status,
  ADD COLUMN IF NOT EXISTS closed_reason  VARCHAR(120) NULL AFTER next_follow_up,
  ADD COLUMN IF NOT EXISTS owner_notes    TEXT NULL AFTER closed_reason,
  ADD COLUMN IF NOT EXISTS client_id      INT UNSIGNED NULL AFTER owner_notes,
  ADD COLUMN IF NOT EXISTS job_id         INT UNSIGNED NULL AFTER client_id,
  ADD COLUMN IF NOT EXISTS conversion_key VARCHAR(64) NULL AFTER job_id,
  ADD COLUMN IF NOT EXISTS converted_at   DATETIME NULL AFTER conversion_key,
  ADD COLUMN IF NOT EXISTS converted_by   INT UNSIGNED NULL AFTER converted_at,
  ADD COLUMN IF NOT EXISTS request_key    VARCHAR(64) NULL AFTER converted_by,
  ADD UNIQUE KEY IF NOT EXISTS uniq_conversion_key (conversion_key),
  ADD UNIQUE KEY IF NOT EXISTS uniq_enquiry_request_key (request_key),
  ADD KEY IF NOT EXISTS idx_follow_up (next_follow_up);

-- Record what the status rename touches, then rename (only when there is any).
INSERT INTO audit_log (user_id, action, entity, entity_id, meta)
SELECT NULL, 'migration_phase18', 'enquiry', NULL,
       JSON_OBJECT('note', 'enquiries.status contacted -> awaiting_reply', 'rows', COUNT(*))
  FROM enquiries WHERE status = 'contacted' HAVING COUNT(*) > 0;
UPDATE enquiries SET status = 'awaiting_reply' WHERE status = 'contacted';

-- ── 5. Settings defaults (owner decisions, 10 October 2026) ───────────────────
-- Editable in Settings. Deposit policy, quote validity and default terms are
-- left empty on purpose: a quote shows only what the owner enters.
INSERT INTO settings (skey, svalue) VALUES
  ('measurement_recheck_days', '180'),
  ('payment_verified_methods', '["cash"]')
ON DUPLICATE KEY UPDATE skey = skey;
