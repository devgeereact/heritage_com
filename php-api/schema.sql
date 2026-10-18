-- HeritOS — foundation schema.
-- Import in cPanel → phpMyAdmin → your HeritOS database → SQL tab.
-- Charset utf8mb4 throughout so Naira ₦, emoji and African names store cleanly.

SET NAMES utf8mb4;
SET time_zone = '+01:00';   -- West Africa Time (Lagos)

-- ---------------------------------------------------------------------------
-- Smoke test table. Proves the React → api.php → MySQL → JSON pipe.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  label       VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Users & roles. Roles per brief §6.1, shaped for a fashion brand:
--   super_admin, admin, manager, trainer→tailor, editor, employee→seller, client→customer
-- We keep the canonical set plus brand-specific aliases.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(160) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('super_admin','admin','manager','tailor','editor','seller','employee','customer')
                NOT NULL DEFAULT 'employee',
  phone         VARCHAR(40) NULL,
  status        ENUM('active','invited','suspended') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Session tokens. React sends `Authorization: Bearer <token>`; PHP validates.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  token       CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_token (token),
  KEY idx_user (user_id),
  CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Audit log of sensitive actions (§6.1).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NULL,
  action      VARCHAR(80) NOT NULL,
  entity      VARCHAR(80) NULL,
  entity_id   INT UNSIGNED NULL,
  meta        JSON NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  KEY idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Seed: super-admin (brief §6.1). Login: dev@heritclothing.com / Testing123!
-- Change this password immediately after first login in production.
-- ---------------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role, status)
VALUES (
  'Herit Admin',
  'dev@heritclothing.com',
  '$2y$12$N5U.MHXD6qE3xTsFC.joEu3y6Ysr4fA.2hnd2EilVC2zMKV6nSDXG',
  'super_admin',
  'active'
)
ON DUPLICATE KEY UPDATE email = email;

-- (No items seed. `items` is the legacy api.php smoke-test table only; on some
-- databases an older `items` exists without a `label` column, which made this
-- seed abort the whole import with #1054. It's not used by any HeritOS module,
-- so we just don't seed it.)

-- ===========================================================================
-- TAILORING & PRODUCTION — the core of the business (bespoke menswear).
-- ===========================================================================

-- Customers (minimal; CRM module extends this later). Saved measurements live
-- here so a returning customer's fit is ready for the next order.
CREATE TABLE IF NOT EXISTS customers (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(160) NOT NULL,
  phone         VARCHAR(40) NULL,
  email         VARCHAR(190) NULL,
  measurements  JSON NULL,          -- {chest, waist, hip, shoulder, sleeve, length, neck, trouser_length, ...}
  notes         TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A tailoring job: one garment, cut to one customer, moved through the workshop.
CREATE TABLE IF NOT EXISTS tailoring_orders (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code              VARCHAR(20) NOT NULL,        -- HC-0001
  customer_id       INT UNSIGNED NOT NULL,
  garment_type      ENUM('agbada','kaftan','senator','suit','shirt','trouser','other') NOT NULL DEFAULT 'agbada',
  fabric            VARCHAR(160) NULL,           -- Ankara, Adire, Aso-oke, plain suiting...
  measurements      JSON NULL,                   -- snapshot for this order
  notes             TEXT NULL,
  assigned_tailor_id INT UNSIGNED NULL,          -- users.id, role tailor
  stage             ENUM('measure','cut','sew','finish','fitting','done','cancelled')
                    NOT NULL DEFAULT 'measure',
  price             DECIMAL(12,2) NOT NULL DEFAULT 0,
  deposit           DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date          DATE NULL,
  created_by        INT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_code (code),
  KEY idx_stage (stage),
  KEY idx_customer (customer_id),
  KEY idx_tailor (assigned_tailor_id),
  CONSTRAINT fk_torder_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_torder_tailor   FOREIGN KEY (assigned_tailor_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stage history — who moved a job, when, with a note. Drives the audit trail.
CREATE TABLE IF NOT EXISTS tailoring_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED NOT NULL,
  stage       VARCHAR(20) NOT NULL,
  note        VARCHAR(255) NULL,
  user_id     INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order (order_id),
  CONSTRAINT fk_tevent_order FOREIGN KEY (order_id) REFERENCES tailoring_orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: a couple of tailors and demo tailoring jobs so the board has content.
-- The demo tailors cannot sign in: '!' is not a bcrypt hash, so password_verify
-- always fails, and they are suspended. Set a real password and status in the
-- admin if you want to use them.
INSERT INTO users (name, email, password_hash, role, status) VALUES
  ('Tunde (Tailor)', 'tunde@heritclothing.com', '!', 'tailor', 'suspended'),
  ('Bola (Tailor)',  'bola@heritclothing.com',  '!', 'tailor', 'suspended')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO customers (name, phone, measurements) VALUES
  ('Chukwu Okafor', '+2348030000001', '{"chest":42,"waist":36,"shoulder":18,"sleeve":25,"length":58}'),
  ('Emeka Bello',   '+2348030000002', '{"chest":40,"waist":34,"shoulder":17.5,"sleeve":24,"length":56}')
ON DUPLICATE KEY UPDATE name = name;

-- ON DUPLICATE KEY UPDATE on the unique code makes a re-import a no-op here
-- instead of a duplicate-key error (which would abort every CREATE TABLE that
-- follows). Same idempotent pattern as the other seeds above.
INSERT INTO tailoring_orders (code, customer_id, garment_type, fabric, stage, price, deposit, due_date, assigned_tailor_id)
SELECT 'HC-0001', c.id, 'agbada', 'Aso-oke (royal blue)', 'cut', 85000, 40000, DATE_ADD(CURDATE(), INTERVAL 10 DAY),
       (SELECT id FROM users WHERE email='tunde@heritclothing.com')
FROM customers c WHERE c.name='Chukwu Okafor' LIMIT 1
ON DUPLICATE KEY UPDATE code = code;

INSERT INTO tailoring_orders (code, customer_id, garment_type, fabric, stage, price, deposit, due_date, assigned_tailor_id)
SELECT 'HC-0002', c.id, 'senator', 'Plain cotton (cream)', 'sew', 45000, 20000, DATE_ADD(CURDATE(), INTERVAL 5 DAY),
       (SELECT id FROM users WHERE email='bola@heritclothing.com')
FROM customers c WHERE c.name='Emeka Bello' LIMIT 1
ON DUPLICATE KEY UPDATE code = code;

-- ===========================================================================
-- PRODUCTS & VARIANTS — ready-to-wear catalogue (style × colour × size matrix).
-- ===========================================================================

CREATE TABLE IF NOT EXISTS products (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          VARCHAR(20) NOT NULL,            -- PRD-0001, used as SKU prefix
  name          VARCHAR(190) NOT NULL,
  category      VARCHAR(80) NULL,                -- Dresses, Agbada, Accessories...
  fabric        VARCHAR(160) NULL,
  description   TEXT NULL,
  base_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
  image_url     VARCHAR(255) NULL,
  status        ENUM('draft','active','archived') NOT NULL DEFAULT 'active',
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_code (code),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per size × colour. SKU auto: <product code>-<SIZE>-<COLOR>.
CREATE TABLE IF NOT EXISTS product_variants (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id    INT UNSIGNED NOT NULL,
  sku           VARCHAR(60) NOT NULL,
  size          VARCHAR(20) NULL,
  color         VARCHAR(40) NULL,
  stock         INT NOT NULL DEFAULT 0,
  price_override DECIMAL(12,2) NULL,             -- null = use product.base_price
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_sku (sku),
  KEY idx_product (product_id),
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: one demo product with a small size × colour matrix.
INSERT INTO products (code, name, category, fabric, base_price, status, description)
VALUES ('PRD-0001', 'Heritage Ankara Shirt', 'Shirts', 'Ankara (geometric)', 18000, 'active',
        'Short-sleeve shirt cut from bold Ankara print. Ready to wear.')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO product_variants (product_id, sku, size, color, stock)
SELECT p.id, CONCAT('PRD-0001-', s.size, '-', c.color), s.size, c.color, c.stock
FROM products p
JOIN (SELECT 'S' AS size UNION SELECT 'M' UNION SELECT 'L' UNION SELECT 'XL') s
JOIN (SELECT 'Blue' AS color, 12 AS stock UNION SELECT 'Rust', 8) c
WHERE p.code = 'PRD-0001'
ON DUPLICATE KEY UPDATE sku = sku;

-- ===========================================================================
-- ENQUIRIES — public contact / fitting requests from the website.
-- Created by visitors (no login); read and managed by staff.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS enquiries (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(160) NOT NULL,
  phone       VARCHAR(40) NULL,
  email       VARCHAR(190) NULL,
  type        ENUM('fitting','bespoke','wholesale','general') NOT NULL DEFAULT 'general',
  interest    VARCHAR(120) NULL,        -- garment / what they want
  message     TEXT NULL,
  status      ENUM('new','contacted','closed') NOT NULL DEFAULT 'new',
  source      VARCHAR(40) NOT NULL DEFAULT 'website',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status (status),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- ORDERS — selling side (ready-to-wear), across web, WhatsApp and the market.
-- Distinct from tailoring_orders (bespoke). One queue from cart to delivered.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(20) NOT NULL,        -- ORD-0001
  customer_id     INT UNSIGNED NULL,           -- linked customer (optional)
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
  variant_id      INT UNSIGNED NULL,           -- product_variants.id (optional)
  label           VARCHAR(190) NOT NULL,       -- snapshot: "Heritage Kaftan — M / Indigo"
  sku             VARCHAR(60) NULL,
  qty             INT NOT NULL DEFAULT 1,
  unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_order (order_id),
  CONSTRAINT fk_oitem_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Stock adjustments — an audit trail of every change to variant stock.
-- Orders deduct stock directly (orders.php); this table records manual moves:
-- goods received, damages, customer returns, and stock-take corrections.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  variant_id    INT UNSIGNED NOT NULL,
  delta         INT NOT NULL,                       -- signed: +received/+return, -damage, +/-correction
  reason        VARCHAR(30) NOT NULL,               -- received|return|damage|count|correction
  note          VARCHAR(255) NULL,
  stock_after   INT NOT NULL,                       -- variant stock immediately after this move
  user_id       INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_variant (variant_id),
  KEY idx_created (created_at),
  CONSTRAINT fk_adj_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- Suppliers & Purchasing — where stock comes from. Receiving a PO bumps the
-- linked variant's stock (and logs a 'received' stock_adjustments row).
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
  supplier_name VARCHAR(160) NOT NULL,            -- snapshot
  status      VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft|ordered|received|cancelled
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
  variant_id  INT UNSIGNED NULL,                  -- product_variants.id (optional)
  label       VARCHAR(190) NOT NULL,
  sku         VARCHAR(60) NULL,
  qty         INT NOT NULL DEFAULT 1,
  unit_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_po (po_id),
  CONSTRAINT fk_poitem_po FOREIGN KEY (po_id) REFERENCES purchase_orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- Payments & Finance — money in (against orders) and money out (expenses).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS payments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED NULL,
  customer_name VARCHAR(160) NULL,
  amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  method      VARCHAR(20) NOT NULL DEFAULT 'cash',  -- cash|transfer|card|cod
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
  category    VARCHAR(40) NOT NULL DEFAULT 'other',  -- fabric|tailoring|packaging|marketing|rent|fees|other
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
-- Marketing & Social — a lightweight campaign / post planner.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(160) NOT NULL,
  channel     VARCHAR(20) NOT NULL DEFAULT 'instagram', -- instagram|whatsapp|email|tiktok|facebook
  status      VARCHAR(20) NOT NULL DEFAULT 'planned',    -- planned|live|done|paused
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
