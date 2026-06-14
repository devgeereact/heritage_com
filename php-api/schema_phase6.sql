-- HeritOS — Phase 6 migration. Additive only; safe to run on a live DB.
-- Store credit (a signed ledger powering loyalty + refunds-as-credit + manual
-- goodwill) and digital gift cards. A customer's credit balance is simply the
-- SUM(delta) of their ledger rows. Import via phpMyAdmin AFTER schema_phase5.sql.

CREATE TABLE IF NOT EXISTS store_credit (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id  INT UNSIGNED NOT NULL,
  delta        DECIMAL(12,2) NOT NULL,                 -- +earn / -redeem (₦)
  reason       VARCHAR(40) NOT NULL DEFAULT 'adjust',  -- loyalty | redeem | gift | refund | adjust
  ref          VARCHAR(60) NULL,                       -- order code / gift code
  note         VARCHAR(190) NULL,
  created_by   INT UNSIGNED NULL,                      -- staff user, NULL = system/automatic
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customer (customer_id),
  KEY idx_reason (reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gift_cards (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(40) NOT NULL,
  initial_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance         DECIMAL(12,2) NOT NULL DEFAULT 0,
  recipient_name  VARCHAR(160) NULL,
  message         VARCHAR(255) NULL,
  active          TINYINT(1) NOT NULL DEFAULT 1,
  created_by      INT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_code (code),
  KEY idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
