-- HeritOS — Phase 2 migration. Additive only; safe to run on a live DB.
-- Adds: order returns + shipment tracking, product cost (COGS) for profit,
-- and customer tags / segment / loyalty for CRM.
--
-- Import via phpMyAdmin AFTER schema.sql / schema_modules.sql. Uses MariaDB's
-- `ADD COLUMN IF NOT EXISTS`, so re-running is harmless.

-- ── Orders: shipment tracking + returns/exchanges ───────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS courier        VARCHAR(80)  NULL AFTER ship_address,
  ADD COLUMN IF NOT EXISTS tracking_ref   VARCHAR(120) NULL AFTER courier,
  ADD COLUMN IF NOT EXISTS tracking_url   VARCHAR(255) NULL AFTER tracking_ref,
  ADD COLUMN IF NOT EXISTS return_status  ENUM('none','requested','approved','received','refunded','rejected')
                           NOT NULL DEFAULT 'none' AFTER tracking_url,
  ADD COLUMN IF NOT EXISTS return_reason  VARCHAR(255) NULL AFTER return_status;

-- ── Products: cost price (COGS) so profit/margin is real ────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER base_price;

-- ── Customers: tags, segment, loyalty ───────────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS tags           VARCHAR(255) NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS segment        VARCHAR(60)  NULL AFTER tags,
  ADD COLUMN IF NOT EXISTS loyalty_points INT NOT NULL DEFAULT 0 AFTER segment;
