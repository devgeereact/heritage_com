-- HeritOS: Phase 21 migration (Phase 2 daily records, part 4): append-only job
-- payment ledger. Safe to re-run. Import AFTER schema_phase20.sql.
--
-- * Every payment is its own row; mistakes are corrected with a reversal row
--   (reverses_id is unique, so an entry can only be reversed once), never edited
--   or deleted (BR-21). request_key is unique, so a retried submit is never
--   counted twice (BR-22).
-- * Only verified rows count as paid. Cash is verified on entry; transfers wait
--   for the owner (setting payment_verified_methods, default ["cash"]; BR-23).
-- * A reversal copies the verified flag of the entry it reverses, so a plain
--   SUM(amount) over verified rows is always the net amount kept.
-- * tailoring_orders.deposit stays as a cached mirror of paid_total, updated in
--   the same transaction as each ledger write. It is NOT capped at the price any
--   more: an overpayment shows as credit or refund due (BR-24, A05).
-- * Retail `payments` (shop and expenses) stay separate from this ledger.
--
-- DRY RUN FIRST: SELECT COUNT(*), SUM(deposit) FROM tailoring_orders WHERE deposit > 0;

CREATE TABLE IF NOT EXISTS job_payments (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id        INT UNSIGNED NOT NULL,
  kind          ENUM('payment','refund','reversal','adjustment','opening') NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,            -- signed: refunds and reversals of payments are negative
  currency      CHAR(3) NOT NULL DEFAULT 'NGN',
  method        ENUM('cash','transfer','pos_card','gateway','other','unknown') NOT NULL,
  external_ref  VARCHAR(120) NULL,
  received_on   DATE NOT NULL,                     -- Lagos calendar date
  verified      TINYINT(1) NOT NULL DEFAULT 0,
  verified_by   INT UNSIGNED NULL,
  verified_at   DATETIME NULL,                     -- UTC
  reverses_id   BIGINT UNSIGNED NULL,
  note          VARCHAR(255) NULL,
  request_key   VARCHAR(64) NOT NULL,
  recorded_by   INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_jp_request_key (request_key),
  UNIQUE KEY uniq_jp_reverses (reverses_id),
  KEY idx_jp_job (job_id),
  KEY idx_jp_received (received_on),
  KEY idx_jp_verified (verified),
  CONSTRAINT fk_jp_job FOREIGN KEY (job_id) REFERENCES tailoring_orders (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Opening entry from the old single deposit field (once per job, by request key).
INSERT IGNORE INTO job_payments (job_id, kind, amount, method, received_on, verified, note, request_key)
SELECT id, 'opening', deposit, 'unknown', DATE(updated_at), 1,
       'Opening balance from the old deposit field (phase 21)', CONCAT('opening-job-', id)
  FROM tailoring_orders WHERE deposit > 0;

-- Cached totals from the ledger (re-runnable: always recomputed from the rows).
UPDATE tailoring_orders o
   SET o.paid_total = (SELECT COALESCE(SUM(p.amount), 0) FROM job_payments p WHERE p.job_id = o.id AND p.verified = 1);
UPDATE tailoring_orders SET deposit = paid_total;
UPDATE tailoring_orders o
   SET o.payment_state = CASE
     WHEN o.paid_total <= 0 AND EXISTS (SELECT 1 FROM job_payments r WHERE r.job_id = o.id AND r.kind = 'refund' AND r.verified = 1
                                          AND NOT EXISTS (SELECT 1 FROM job_payments x WHERE x.reverses_id = r.id)) THEN 'refunded'
     WHEN o.price <= 0 THEN 'unpriced'
     WHEN o.paid_total <= 0 THEN 'unpaid'
     WHEN o.paid_total < o.price THEN 'part_paid'
     WHEN o.paid_total = o.price THEN 'paid'
     ELSE 'credit' END;
