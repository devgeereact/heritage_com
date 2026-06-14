-- HeritOS — Phase 9 migration. Additive only; safe to run on a live DB.
-- Customer self-service portal: a lightweight session table. A customer logs in
-- with their phone + any real order code (knowledge-based; no password needed and
-- no SMS/OTP infra required). Tokens are random + expiring. Import via phpMyAdmin
-- AFTER schema_phase8.sql.

CREATE TABLE IF NOT EXISTS customer_tokens (
  token        CHAR(48) NOT NULL,
  customer_id  INT UNSIGNED NOT NULL,
  expires_at   DATETIME NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token),
  KEY idx_customer (customer_id),
  KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
