-- HeritOS — Phase 12 migration. Additive only; safe to run on a live DB.
-- Auth: staff PIN login (shared market-stall device) + session/device tracking.
-- Payments need no schema (VAT is a settings key; refunds use store_credit).
-- Import via phpMyAdmin AFTER schema_phase11.sql.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255) NULL AFTER password_hash;

ALTER TABLE auth_tokens
  ADD COLUMN IF NOT EXISTS device    VARCHAR(190) NULL AFTER token,
  ADD COLUMN IF NOT EXISTS ip        VARCHAR(45)  NULL AFTER device,
  ADD COLUMN IF NOT EXISTS last_seen DATETIME     NULL AFTER ip;
