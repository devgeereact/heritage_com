-- HeritOS — Phase 3 migration. Additive only; safe to run on a live DB.
-- Adds the WhatsApp module: a message log (outbound + inbound) and reusable
-- quick-reply templates. Import via phpMyAdmin AFTER schema_phase2.sql.
--
-- WhatsApp is the brand's #1 channel. With Meta Cloud API creds in config.php
-- (WHATSAPP_TOKEN + WHATSAPP_PHONE_ID) messages send for real and inbound ones
-- land here via the webhook. Without creds the app degrades gracefully: every
-- "send" is logged as a click-to-send wa.me link instead, so nothing is lost.

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id    INT UNSIGNED NULL,
  phone          VARCHAR(40) NOT NULL,                  -- E.164-ish, digits kept
  direction      ENUM('out','in') NOT NULL DEFAULT 'out',
  body           TEXT NULL,
  template       VARCHAR(80) NULL,                      -- template/flow name if any
  status         ENUM('queued','manual','sent','delivered','read','failed') NOT NULL DEFAULT 'queued',
  wa_message_id  VARCHAR(120) NULL,                     -- Meta message id (wamid…)
  error          VARCHAR(255) NULL,
  seen           TINYINT(1) NOT NULL DEFAULT 0,         -- inbound read by staff?
  created_by     INT UNSIGNED NULL,                     -- staff user, NULL = system/inbound
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_phone (phone),
  KEY idx_customer (customer_id),
  KEY idx_direction (direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80) NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed a few quick replies for common questions (ignored if they already exist).
INSERT IGNORE INTO whatsapp_templates (name, body) VALUES
  ('Greeting',      'Hello from Herit Clothing! 👋 How can we help you today?'),
  ('Order status',  'Thanks for your order! It is being prepared with care. We will message you the moment it ships.'),
  ('Sizing help',   'Happy to help with sizing. Could you share your chest and waist measurements, or the size you usually wear?'),
  ('Payment info',  'You can pay by card, bank transfer or on delivery (Lagos). Reply here and we will send the details.'),
  ('Aso-ebi quote', 'For matching aso-ebi we offer tiered discounts on 6+ pieces. Tell us the occasion, sizes and date for a quote.');
