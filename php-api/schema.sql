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

-- Seed a couple of smoke-test items so the dashboard shows data on first load.
INSERT INTO items (label) VALUES ('HeritOS pipe online'), ('Ajuwon Market, Lagos');

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
INSERT INTO users (name, email, password_hash, role, status) VALUES
  ('Tunde (Tailor)', 'tunde@heritclothing.com', '$2y$12$N5U.MHXD6qE3xTsFC.joEu3y6Ysr4fA.2hnd2EilVC2zMKV6nSDXG', 'tailor', 'active'),
  ('Bola (Tailor)',  'bola@heritclothing.com',  '$2y$12$N5U.MHXD6qE3xTsFC.joEu3y6Ysr4fA.2hnd2EilVC2zMKV6nSDXG', 'tailor', 'active')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO customers (name, phone, measurements) VALUES
  ('Chukwu Okafor', '+2348030000001', '{"chest":42,"waist":36,"shoulder":18,"sleeve":25,"length":58}'),
  ('Emeka Bello',   '+2348030000002', '{"chest":40,"waist":34,"shoulder":17.5,"sleeve":24,"length":56}')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO tailoring_orders (code, customer_id, garment_type, fabric, stage, price, deposit, due_date, assigned_tailor_id)
SELECT 'HC-0001', c.id, 'agbada', 'Aso-oke (royal blue)', 'cut', 85000, 40000, DATE_ADD(CURDATE(), INTERVAL 10 DAY),
       (SELECT id FROM users WHERE email='tunde@heritclothing.com')
FROM customers c WHERE c.name='Chukwu Okafor' LIMIT 1;

INSERT INTO tailoring_orders (code, customer_id, garment_type, fabric, stage, price, deposit, due_date, assigned_tailor_id)
SELECT 'HC-0002', c.id, 'senator', 'Plain cotton (cream)', 'sew', 45000, 20000, DATE_ADD(CURDATE(), INTERVAL 5 DAY),
       (SELECT id FROM users WHERE email='bola@heritclothing.com')
FROM customers c WHERE c.name='Emeka Bello' LIMIT 1;

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
ON DUPLICATE KEY UPDATE product_variants.size = product_variants.size;
