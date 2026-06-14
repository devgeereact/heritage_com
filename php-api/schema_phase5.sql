-- HeritOS — Phase 5 migration. Additive only; safe to run on a live DB.
-- The promotions engine: discount codes (%, fixed, free shipping) with spend
-- floors, usage caps and date windows, plus a redemption log for attribution.
--
-- Import via phpMyAdmin AFTER schema_phase4.sql.

CREATE TABLE IF NOT EXISTS coupons (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code         VARCHAR(40) NOT NULL,                  -- HERIT10 (case-insensitive use)
  type         ENUM('percent','fixed','free_ship') NOT NULL DEFAULT 'percent',
  value        DECIMAL(12,2) NOT NULL DEFAULT 0,      -- percent: 10 = 10% · fixed: ₦ off · free_ship: unused
  min_spend    DECIMAL(12,2) NOT NULL DEFAULT 0,      -- goods subtotal required
  usage_limit  INT NOT NULL DEFAULT 0,                -- 0 = unlimited
  used         INT NOT NULL DEFAULT 0,
  starts_at    DATE NULL,
  expires_at   DATE NULL,
  active       TINYINT(1) NOT NULL DEFAULT 1,
  description  VARCHAR(190) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_code (code),
  KEY idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  coupon_id   INT UNSIGNED NOT NULL,
  order_id    INT UNSIGNED NULL,
  code        VARCHAR(40) NOT NULL,
  discount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_coupon (coupon_id),
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the welcome offer (footer newsletter promises HERIT10) + a free-ship code.
INSERT IGNORE INTO coupons (code, type, value, min_spend, description) VALUES
  ('HERIT10',  'percent',   10, 0,     'Welcome offer — 10% off your first order'),
  ('FREESHIP', 'free_ship', 0,  25000, 'Free delivery on orders over ₦25,000');
