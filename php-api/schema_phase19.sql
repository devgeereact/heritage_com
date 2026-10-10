-- HeritOS: Phase 19 migration (Phase 2 daily records, part 2): dated measurement
-- sets and job snapshots. Additive; safe to re-run. Import AFTER schema_phase18.sql.
--
-- * measurement_templates: editable field lists. The five garment templates are
--   seeded as PROPOSED (owner to confirm the fields and measuring method); the
--   owner edits them in Settings. 'legacy' is hidden and only holds imported data.
-- * measurement_sets: immutable values; a correction is a new set. Statuses:
--   pending, approved, superseded, rejected, imported_unverified.
-- * Legacy JSON from customers.measurements and tailoring_orders.measurements is
--   imported once (unique legacy_source) as unit 'unknown', status
--   'imported_unverified' (owner decision, 10 October 2026): the owner confirms
--   cm or inches before approving. The legacy columns are left untouched.
--
-- DRY RUN FIRST:
--   SELECT COUNT(*) FROM customers WHERE JSON_VALID(measurements) AND JSON_TYPE(measurements) = 'OBJECT' AND JSON_LENGTH(measurements) > 0;
--   SELECT COUNT(*) FROM tailoring_orders WHERE JSON_VALID(measurements) AND JSON_TYPE(measurements) = 'OBJECT' AND JSON_LENGTH(measurements) > 0;

CREATE TABLE IF NOT EXISTS measurement_templates (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tkey        VARCHAR(40) NOT NULL,
  label       VARCHAR(80) NOT NULL,
  fields      JSON NOT NULL,                       -- [{key, label, guide, hidden?}]
  active      TINYINT(1) NOT NULL DEFAULT 1,
  proposed    TINYINT(1) NOT NULL DEFAULT 1,       -- 1 until the owner confirms the template
  note        VARCHAR(255) NULL,
  sort        SMALLINT NOT NULL DEFAULT 0,
  updated_by  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_tkey (tkey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS measurement_sets (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id    INT UNSIGNED NOT NULL,
  template_key   VARCHAR(40) NOT NULL,
  unit           ENUM('cm','in','unknown') NOT NULL,
  vals           JSON NOT NULL,                     -- {key: number}; missing stays missing
  fit_preference ENUM('slim','regular','relaxed') NULL,
  notes          VARCHAR(500) NULL,
  source         ENUM('owner','customer','imported') NOT NULL,
  status         ENUM('pending','approved','superseded','rejected','imported_unverified') NOT NULL,
  taken_at       DATE NULL,
  supersedes_id  INT UNSIGNED NULL,
  approved_by    INT UNSIGNED NULL,
  approved_at    DATETIME NULL,                     -- UTC
  rejected_by    INT UNSIGNED NULL,
  rejected_at    DATETIME NULL,                     -- UTC
  reject_reason  VARCHAR(255) NULL,
  created_by     INT UNSIGNED NULL,                 -- staff user; NULL for customer or import
  request_key    VARCHAR(64) NULL,
  legacy_source  VARCHAR(60) NULL,                  -- customers:ID or job:ID for imported sets
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_ms_request_key (request_key),
  UNIQUE KEY uniq_ms_legacy_source (legacy_source),
  KEY idx_ms_cust (customer_id, template_key, status),
  KEY idx_ms_status (status),
  CONSTRAINT fk_ms_cust FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tailoring_orders
  ADD COLUMN IF NOT EXISTS measurement_set_id      INT UNSIGNED NULL AFTER measurements,
  ADD COLUMN IF NOT EXISTS measurement_snapshot    JSON NULL AFTER measurement_set_id,
  ADD COLUMN IF NOT EXISTS measurement_snapshot_at DATETIME NULL AFTER measurement_snapshot,   -- UTC; NULL = legacy, never approved
  ADD COLUMN IF NOT EXISTS measurement_snapshot_by INT UNSIGNED NULL AFTER measurement_snapshot_at;

-- ── Templates (PROPOSED: owner to confirm fields and measuring method) ────────
INSERT IGNORE INTO measurement_templates (tkey, label, fields, active, proposed, note, sort) VALUES
 ('shirt', 'Shirt', '[{"key":"neck","label":"Neck","guide":""},{"key":"chest","label":"Chest","guide":""},{"key":"waist","label":"Waist","guide":""},{"key":"shoulder","label":"Shoulder","guide":""},{"key":"sleeve_length","label":"Sleeve length","guide":""},{"key":"cuff","label":"Cuff","guide":""},{"key":"shirt_length","label":"Shirt length","guide":""}]',
  1, 1, 'Proposed, owner to confirm', 10),
 ('trousers', 'Trousers', '[{"key":"waist","label":"Waist","guide":""},{"key":"seat","label":"Seat","guide":""},{"key":"thigh","label":"Thigh","guide":""},{"key":"knee","label":"Knee","guide":""},{"key":"bottom","label":"Bottom","guide":""},{"key":"outside_leg","label":"Outside leg","guide":""},{"key":"inside_leg","label":"Inside leg","guide":""}]',
  1, 1, 'Proposed, owner to confirm', 20),
 ('jacket', 'Jacket or two-piece top', '[{"key":"chest","label":"Chest","guide":""},{"key":"waist","label":"Waist","guide":""},{"key":"seat","label":"Seat","guide":""},{"key":"shoulder","label":"Shoulder","guide":""},{"key":"sleeve_length","label":"Sleeve length","guide":""},{"key":"back_length","label":"Back length","guide":""},{"key":"front_length","label":"Front length","guide":""}]',
  1, 1, 'Proposed, owner to confirm', 30),
 ('native_top', 'Native top (kaftan, senator)', '[{"key":"neck","label":"Neck","guide":""},{"key":"chest","label":"Chest","guide":""},{"key":"shoulder","label":"Shoulder","guide":""},{"key":"sleeve_length","label":"Sleeve length","guide":""},{"key":"top_length","label":"Top length","guide":""},{"key":"cuff","label":"Cuff","guide":""}]',
  1, 1, 'Proposed, owner to confirm', 40),
 ('long_gown', 'Long gown (agbada)', '[{"key":"shoulder_width","label":"Shoulder width","guide":""},{"key":"full_length","label":"Full length","guide":""},{"key":"chest","label":"Chest","guide":""},{"key":"neck","label":"Neck","guide":""}]',
  1, 1, 'Proposed, owner to confirm', 50),
 ('legacy', 'Old measurement form', '[{"key":"neck","label":"Neck","guide":""},{"key":"shoulder","label":"Shoulder","guide":""},{"key":"chest","label":"Chest","guide":""},{"key":"waist","label":"Waist","guide":""},{"key":"hip","label":"Hip","guide":""},{"key":"sleeve","label":"Sleeve","guide":""},{"key":"length","label":"Length","guide":""},{"key":"thigh","label":"Thigh","guide":""},{"key":"trouser_length","label":"Trouser length","guide":""},{"key":"ankle","label":"Ankle","guide":""}]',
  0, 0, 'Hidden: holds imported values and entries from the old form only', 99);

-- ── Legacy import: client profiles ───────────────────────────────────────────
INSERT IGNORE INTO measurement_sets (customer_id, template_key, unit, vals, notes, source, status, taken_at, legacy_source)
SELECT c.id, 'legacy', 'unknown', JSON_REMOVE(c.measurements, '$.unit'),
       CONCAT('Imported, unverified. Unit unknown: confirm cm or inches before approving.',
              IF(JSON_EXTRACT(c.measurements, '$.unit') IS NOT NULL,
                 CONCAT(' The old record says unit: ', JSON_UNQUOTE(JSON_EXTRACT(c.measurements, '$.unit')), '.'), '')),
       'imported', 'imported_unverified', DATE(c.updated_at), CONCAT('customers:', c.id)
  FROM customers c
 WHERE c.measurements IS NOT NULL AND JSON_VALID(c.measurements)
   AND JSON_TYPE(c.measurements) = 'OBJECT' AND JSON_LENGTH(JSON_REMOVE(c.measurements, '$.unit')) > 0;

-- ── Legacy import: job snapshots ─────────────────────────────────────────────
INSERT IGNORE INTO measurement_sets (customer_id, template_key, unit, vals, notes, source, status, taken_at, legacy_source)
SELECT o.customer_id, 'legacy', 'unknown', JSON_REMOVE(o.measurements, '$.unit'),
       CONCAT('Imported from job ', o.code, ', unverified. Unit unknown: confirm cm or inches before approving.',
              IF(JSON_EXTRACT(o.measurements, '$.unit') IS NOT NULL,
                 CONCAT(' The old record says unit: ', JSON_UNQUOTE(JSON_EXTRACT(o.measurements, '$.unit')), '.'), '')),
       'imported', 'imported_unverified', DATE(o.updated_at), CONCAT('job:', o.id)
  FROM tailoring_orders o
 WHERE o.measurements IS NOT NULL AND JSON_VALID(o.measurements)
   AND JSON_TYPE(o.measurements) = 'OBJECT' AND JSON_LENGTH(JSON_REMOVE(o.measurements, '$.unit')) > 0;

-- The job keeps what it was cut from: a legacy snapshot pointing at its imported
-- set. measurement_snapshot_at stays NULL, meaning "legacy, never approved".
UPDATE tailoring_orders o
  JOIN measurement_sets s ON s.legacy_source = CONCAT('job:', o.id)
   SET o.measurement_set_id = s.id,
       o.measurement_snapshot = JSON_OBJECT('legacy', TRUE, 'set_id', s.id, 'template_key', 'legacy',
                                            'label', 'Old measurement form', 'unit', 'unknown',
                                            'vals', JSON_QUERY(s.vals, '$'), 'taken_at', s.taken_at)
 WHERE o.measurement_set_id IS NULL;
