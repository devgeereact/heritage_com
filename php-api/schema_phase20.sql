-- HeritOS: Phase 20 migration (Phase 2 daily records, part 3): versioned quotes.
-- New tables only; safe to re-run. Import AFTER schema_phase19.sql.
--
-- A quote number is shown as Q-{series_id}-v{version} and is not stored. The
-- first version's series_id is its own id. Any edit after sending is a new
-- version that needs a new acceptance (BR-19). Totals are always computed on the
-- server. No deposit, validity or terms are assumed: a quote shows only what the
-- owner entered (BR-20; settings deposit_policy_text, quote_validity_days and
-- quote_default_terms start empty).

CREATE TABLE IF NOT EXISTS quotes (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  series_id             INT UNSIGNED NULL,
  version               SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  job_id                INT UNSIGNED NULL,
  enquiry_id            INT UNSIGNED NULL,
  customer_id           INT UNSIGNED NOT NULL,
  status                ENUM('draft','sent','accepted','superseded','declined','expired','withdrawn') NOT NULL DEFAULT 'draft',
  currency              CHAR(3) NOT NULL DEFAULT 'NGN',
  subtotal              DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_charge       DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount              DECIMAL(12,2) NOT NULL DEFAULT 0,
  total                 DECIMAL(12,2) NOT NULL DEFAULT 0,
  deposit_required      DECIMAL(12,2) NULL,
  fabric_responsibility ENUM('client','herit','mixed') NULL,
  fitting_allowance     VARCHAR(255) NULL,
  terms                 TEXT NULL,
  exclusions            TEXT NULL,
  valid_until           DATE NULL,
  promised_date         DATE NULL,
  content_hash          CHAR(64) NULL,                -- frozen when sent
  sent_at               DATETIME NULL,                -- UTC
  sent_channel          VARCHAR(20) NULL,
  accepted_at           DATETIME NULL,                -- UTC
  accepted_channel      ENUM('in_person','whatsapp','email','phone','portal') NULL,
  acceptance_note       VARCHAR(255) NULL,
  accepted_recorded_by  INT UNSIGNED NULL,
  closed_note           VARCHAR(255) NULL,            -- decline or withdraw note
  request_key           VARCHAR(64) NULL,
  created_by            INT UNSIGNED NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_series_ver (series_id, version),
  UNIQUE KEY uniq_quote_request_key (request_key),
  KEY idx_quote_job (job_id),
  KEY idx_quote_enquiry (enquiry_id),
  KEY idx_quote_customer (customer_id),
  KEY idx_quote_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quote_items (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quote_id     INT UNSIGNED NOT NULL,
  sort         SMALLINT NOT NULL DEFAULT 0,
  description  VARCHAR(255) NOT NULL,
  garment_type VARCHAR(40) NULL,
  qty          DECIMAL(8,2) NOT NULL DEFAULT 1,
  unit_price   DECIMAL(12,2) NOT NULL,
  line_total   DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_qi_quote (quote_id),
  CONSTRAINT fk_qi_quote FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
