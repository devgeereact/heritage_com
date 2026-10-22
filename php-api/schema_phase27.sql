-- HeritOS Phase 5: company orders (BUILD-SPEC 5.2; numbered 27 because the
-- Phase 4 schema_phase27 was not needed, D-022). Additive and re-runnable:
-- every table, column and key uses IF NOT EXISTS (MariaDB 10.0.2+ / MySQL 8).
--
-- A company order is one tailoring_orders row with job_kind = 'company', plus
-- job_items where garments or wearers differ (BR-28). tailoring_groups stay as
-- "coordinated, separate payers" and are not the company parent (5.1).
-- Nothing here changes existing rows: every new column has a default that
-- keeps today's jobs exactly as they are (job_kind 'individual').

CREATE TABLE IF NOT EXISTS companies (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_ref      VARCHAR(16) NULL UNIQUE,
  name             VARCHAR(160) NOT NULL,
  invoice_name     VARCHAR(160) NULL,
  invoice_address  TEXT NULL,
  invoice_email    VARCHAR(190) NULL,
  tax_id           VARCHAR(40) NULL,
  notes_internal   TEXT NULL,                       -- staff only, never in any portal answer
  created_by       INT UNSIGNED NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  KEY idx_company_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A person (an ordinary customers row) who acts for a company, with what they may do.
CREATE TABLE IF NOT EXISTS company_contacts (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id            INT UNSIGNED NOT NULL,
  customer_id           INT UNSIGNED NOT NULL,
  role_title            VARCHAR(80) NULL,
  can_view_jobs         TINYINT(1) NOT NULL DEFAULT 1,
  can_approve_samples   TINYINT(1) NOT NULL DEFAULT 0,
  is_invoice_recipient  TINYINT(1) NOT NULL DEFAULT 0,
  active                TINYINT(1) NOT NULL DEFAULT 1,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_customer (company_id, customer_id),
  KEY idx_contact_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tailoring_orders
  ADD COLUMN IF NOT EXISTS job_kind ENUM('individual','company') NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS company_id INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS po_number VARCHAR(60) NULL,
  ADD COLUMN IF NOT EXISTS invoice_contact_id INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS measurement_method ENUM('individual','sizes','mixed') NULL,
  ADD COLUMN IF NOT EXISTS sample_status ENUM('not_required','pending','submitted','approved','changes_requested') NOT NULL DEFAULT 'not_required',
  ADD KEY IF NOT EXISTS idx_company (company_id);

-- Lines of a company job. Wearers are customers rows; a company contact never sees them.
CREATE TABLE IF NOT EXISTS job_items (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_id              INT UNSIGNED NOT NULL,
  sort                SMALLINT NOT NULL DEFAULT 0,
  description         VARCHAR(160) NOT NULL,
  garment_type        VARCHAR(40) NULL,
  service_key         VARCHAR(40) NULL,
  qty                 SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  size_label          VARCHAR(20) NULL,
  wearer_customer_id  INT UNSIGNED NULL,
  wearer_label        VARCHAR(80) NULL,              -- staff-only label ("Driver 2"), never public
  measurement_set_id  INT UNSIGNED NULL,
  wearer_consent_at   DATETIME NULL,                 -- UTC
  item_stage          ENUM('pending','in_production','ready','handed_over','cancelled') NOT NULL DEFAULT 'pending',
  qty_ready           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  qty_handed_over     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  request_key         VARCHAR(64) NULL UNIQUE,
  lock_version        INT UNSIGNED NOT NULL DEFAULT 0,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_items_job (job_id),
  KEY idx_items_wearer (wearer_customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample versions for a company job, with the recorded decision.
CREATE TABLE IF NOT EXISTS job_samples (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_id              INT UNSIGNED NOT NULL,
  item_id             INT UNSIGNED NULL,
  version             SMALLINT UNSIGNED NOT NULL,
  description         VARCHAR(255) NOT NULL,
  status              ENUM('submitted','approved','changes_requested','withdrawn') NOT NULL DEFAULT 'submitted',
  decided_channel     ENUM('portal','in_person','whatsapp','email','phone') NULL,
  decided_contact_id  INT UNSIGNED NULL,
  decided_by_user     INT UNSIGNED NULL,
  decision_note       VARCHAR(500) NULL,
  decided_at          DATETIME NULL,                 -- UTC
  request_key         VARCHAR(64) NOT NULL UNIQUE,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_job_version (job_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Which items (and how many of each) went out in a handover.
CREATE TABLE IF NOT EXISTS job_handover_items (
  handover_id  INT UNSIGNED NOT NULL,
  item_id      INT UNSIGNED NOT NULL,
  qty          SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (handover_id, item_id),
  KEY idx_hitems_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bill-to for company quotes, frozen when the quote is sent.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS bill_to_company_id INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS po_number VARCHAR(60) NULL,
  ADD COLUMN IF NOT EXISTS bill_to_snapshot JSON NULL;
