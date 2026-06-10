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
-- Seed: super-admin (brief §6.1). Login: dev@heritclothings.com / Testing123!
-- Change this password immediately after first login in production.
-- ---------------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role, status)
VALUES (
  'Herit Admin',
  'dev@heritclothings.com',
  '$2y$12$N5U.MHXD6qE3xTsFC.joEu3y6Ysr4fA.2hnd2EilVC2zMKV6nSDXG',
  'super_admin',
  'active'
)
ON DUPLICATE KEY UPDATE email = email;

-- Seed a couple of smoke-test items so the dashboard shows data on first load.
INSERT INTO items (label) VALUES ('HeritOS pipe online'), ('Ajuwon Market, Lagos');
