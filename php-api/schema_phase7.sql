-- HeritOS — Phase 7 migration. Additive only; safe to run on a live DB.
-- Referral program ("give ₦2,000, get ₦2,000"): each customer gets a shareable
-- code; a referred friend's FIRST paid order credits store credit to both.
-- Import via phpMyAdmin AFTER schema_phase6.sql.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) NULL AFTER segment;

-- Unique referral codes (NULLs allowed; uniqueness only enforced on real codes).
ALTER TABLE customers
  ADD UNIQUE KEY IF NOT EXISTS uniq_referral_code (referral_code);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS referral_code     VARCHAR(20) NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS referrer_id       INT UNSIGNED NULL AFTER referral_code,
  ADD COLUMN IF NOT EXISTS referral_settled  TINYINT(1) NOT NULL DEFAULT 0 AFTER referrer_id;
