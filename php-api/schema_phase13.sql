-- HeritOS — Phase 13 migration. Additive only; safe to run on a live DB.
-- Aso-ebi / group orders: one organiser, many members, group pricing. Each
-- member is a normal tailoring_order linked by group_id, so the workshop board
-- and pipeline work unchanged. Import via phpMyAdmin AFTER schema_phase12.sql.

CREATE TABLE IF NOT EXISTS tailoring_groups (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(20) NOT NULL,             -- HCG-0001
  organiser_name  VARCHAR(160) NOT NULL,
  organiser_phone VARCHAR(40) NULL,
  event           VARCHAR(190) NULL,                -- wedding, burial, birthday…
  due_date        DATE NULL,
  discount_pct    DECIMAL(5,2) NOT NULL DEFAULT 0,  -- group discount on each piece
  notes           TEXT NULL,
  created_by      INT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tailoring_orders
  ADD COLUMN IF NOT EXISTS group_id INT UNSIGNED NULL AFTER customer_id,
  ADD KEY IF NOT EXISTS idx_group (group_id);
