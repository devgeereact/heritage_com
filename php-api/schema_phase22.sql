-- HeritOS: Phase 22 migration (Phase 2 daily records, part 5): delivery and
-- collection records. New table only; safe to re-run. Import AFTER schema_phase21.sql.
--
-- A job reaches handed_over only through completed handovers: once the completed
-- quantity reaches the job quantity. A partial handover leaves the job at ready
-- ("2 of 5 handed over", BR-28). Handing over with a balance outstanding is
-- allowed; the balance at that moment is recorded.

CREATE TABLE IF NOT EXISTS job_handovers (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id              INT UNSIGNED NOT NULL,
  method              ENUM('collection','delivery') NOT NULL,
  status              ENUM('planned','dispatched','completed','failed','cancelled') NOT NULL DEFAULT 'planned',
  planned_for         DATETIME NULL,                 -- UTC
  completed_at        DATETIME NULL,                 -- UTC
  quantity            SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  address             TEXT NULL,
  courier             VARCHAR(80) NULL,
  contact_name        VARCHAR(120) NULL,
  contact_phone       VARCHAR(40) NULL,
  tracking_url        VARCHAR(255) NULL,             -- https only
  received_by         VARCHAR(120) NULL,
  evidence_note       VARCHAR(255) NULL,
  balance_at_handover DECIMAL(12,2) NULL,
  checklist           JSON NULL,                     -- {garment_count, fit, finishing, packaging, accessories, instructions}
  request_key         VARCHAR(64) NOT NULL,
  recorded_by         INT UNSIGNED NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_ho_request_key (request_key),
  KEY idx_ho_job (job_id),
  KEY idx_ho_status (status),
  CONSTRAINT fk_ho_job FOREIGN KEY (job_id) REFERENCES tailoring_orders (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
