-- HeritOS — missing-module tables only.
-- Import this in phpMyAdmin → DB heritage_com → SQL/Import tab.
--
-- Use this instead of the full schema.sql when the early tables (users,
-- customers, products, tailoring…) already exist and you only need the later
-- modules. Every statement is CREATE TABLE IF NOT EXISTS, so it's safe to run
-- more than once and it touches no existing data.
--
-- Creates: orders, order_items, stock_adjustments, suppliers, purchase_orders,
--          purchase_order_items, payments, expenses, campaigns, settings.

SET NAMES utf8mb4;

-- ===========================================================================
-- ORDERS — selling side (ready-to-wear), across web, WhatsApp and the market.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(20) NOT NULL,
  customer_id     INT UNSIGNED NULL,
  customer_name   VARCHAR(160) NOT NULL,
  customer_phone  VARCHAR(40) NULL,
  channel         ENUM('web','whatsapp','market','instagram','phone') NOT NULL DEFAULT 'web',
  status          ENUM('pending','paid','making','packing','shipped','delivered','cancelled')
                  NOT NULL DEFAULT 'pending',
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid            DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method  ENUM('cash','transfer','card','cod','unpaid') NOT NULL DEFAULT 'unpaid',
  ship_address    TEXT NULL,
  notes           TEXT NULL,
  created_by      INT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_code (code),
  KEY idx_status (status),
  KEY idx_channel (channel),
  KEY idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id        INT UNSIGNED NOT NULL,
  variant_id      INT UNSIGNED NULL,
  label           VARCHAR(190) NOT NULL,
  sku             VARCHAR(60) NULL,
  qty             INT NOT NULL DEFAULT 1,
  unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_order (order_id),
  CONSTRAINT fk_oitem_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Stock adjustments — audit trail of every change to variant stock.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  variant_id    INT UNSIGNED NOT NULL,
  delta         INT NOT NULL,
  reason        VARCHAR(30) NOT NULL,
  note          VARCHAR(255) NULL,
  stock_after   INT NOT NULL,
  user_id       INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_variant (variant_id),
  KEY idx_created (created_at),
  CONSTRAINT fk_adj_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- Suppliers & Purchasing.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(160) NOT NULL,
  contact     VARCHAR(120) NULL,
  phone       VARCHAR(40) NULL,
  email       VARCHAR(160) NULL,
  address     VARCHAR(255) NULL,
  notes       TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(20) NOT NULL,
  supplier_id INT UNSIGNED NULL,
  supplier_name VARCHAR(160) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'draft',
  total       DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes       VARCHAR(255) NULL,
  created_by  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_at TIMESTAMP NULL,
  deleted_at  TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_code (code),
  KEY idx_supplier (supplier_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  po_id       INT UNSIGNED NOT NULL,
  variant_id  INT UNSIGNED NULL,
  label       VARCHAR(190) NOT NULL,
  sku         VARCHAR(60) NULL,
  qty         INT NOT NULL DEFAULT 1,
  unit_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_po (po_id),
  CONSTRAINT fk_poitem_po FOREIGN KEY (po_id) REFERENCES purchase_orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- Payments & Finance.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS payments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED NULL,
  customer_name VARCHAR(160) NULL,
  amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  method      VARCHAR(20) NOT NULL DEFAULT 'cash',
  reference   VARCHAR(120) NULL,
  note        VARCHAR(255) NULL,
  created_by  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order (order_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category    VARCHAR(40) NOT NULL DEFAULT 'other',
  amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  vendor      VARCHAR(160) NULL,
  note        VARCHAR(255) NULL,
  spent_on    DATE NOT NULL,
  created_by  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_spent (spent_on),
  KEY idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- Marketing & Social — campaign / post planner.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(160) NOT NULL,
  channel     VARCHAR(20) NOT NULL DEFAULT 'instagram',
  status      VARCHAR(20) NOT NULL DEFAULT 'planned',
  goal        VARCHAR(255) NULL,
  starts_on   DATE NULL,
  ends_on     DATE NULL,
  notes       TEXT NULL,
  created_by  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- Platform settings — key/value store (channels, store config).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS settings (
  skey        VARCHAR(60) NOT NULL,
  svalue      TEXT NULL,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by  INT UNSIGNED NULL,
  PRIMARY KEY (skey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (skey, svalue) VALUES
  ('store_name', 'Herit Clothing'),
  ('currency', 'NGN'),
  ('free_ship_threshold', '25000'),
  ('channels', '{"web":true,"whatsapp":true,"instagram":true,"market":true,"phone":false}')
ON DUPLICATE KEY UPDATE skey = skey;
