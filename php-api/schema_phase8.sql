-- HeritOS — Phase 8 migration. Additive only; safe to run on a live DB.
-- Sweeps the rest of the buildable Marketing/Loyalty/Promotions section:
-- restock waitlist ("notify me"), abandoned-cart recovery, and UTM/campaign
-- attribution on orders. Import via phpMyAdmin AFTER schema_phase7.sql.

-- ── Restock / drop waitlist ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product       VARCHAR(190) NOT NULL,          -- product name / piece
  slug          VARCHAR(190) NULL,
  size          VARCHAR(40) NULL,
  customer_name VARCHAR(160) NULL,
  phone         VARCHAR(40) NULL,
  email         VARCHAR(190) NULL,
  customer_id   INT UNSIGNED NULL,
  notified      TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notified_at   TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_slug (slug),
  KEY idx_notified (notified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Abandoned carts (one live row per phone, upserted) ──────────────────────
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone         VARCHAR(40) NOT NULL,
  customer_name VARCHAR(160) NULL,
  email         VARCHAR(190) NULL,
  items         JSON NULL,
  subtotal      DECIMAL(12,2) NOT NULL DEFAULT 0,
  recovered     TINYINT(1) NOT NULL DEFAULT 0,   -- order placed since
  nudged        TINYINT(1) NOT NULL DEFAULT 0,   -- recovery message sent
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_phone (phone),
  KEY idx_recovered (recovered)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Orders: campaign attribution ────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source       VARCHAR(60) NULL AFTER channel,
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(120) NULL AFTER source;
