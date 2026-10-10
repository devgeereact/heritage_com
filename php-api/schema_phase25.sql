-- HeritOS: Phase 25 migration (Phase 3 messages, change requests, feedback).
-- Additive; safe to re-run. Import via phpMyAdmin AFTER schema_phase24.sql.
--
-- 1. job_messages: one thread per job. 'internal' notes never leave the admin
--    side; 'client' messages show in the portal. Bodies are plain text.
-- 2. job_change_requests: reschedule, address, measurement, garment or other.
--    The owner approves or declines; after cutting starts, measurement and
--    garment changes need a stated price or date effect (BR-30).
-- 3. job_feedback: one per job, private by default, with separate publication
--    and photo consents and a copy of the wording the customer agreed to.
-- 4. Proposed consent wording (owner to confirm or edit in Settings).

CREATE TABLE IF NOT EXISTS job_messages (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id               INT UNSIGNED NOT NULL,
  customer_id          INT UNSIGNED NOT NULL,
  author_type          ENUM('owner','customer','system') NOT NULL,
  author_user_id       INT UNSIGNED NULL,
  visibility           ENUM('internal','client') NOT NULL,
  channel              ENUM('portal','whatsapp','email','phone','in_person','note') NOT NULL,
  body                 TEXT NOT NULL,
  delivery_status      ENUM('na','queued','sent','failed','manual') NOT NULL DEFAULT 'na',
  read_by_owner_at     DATETIME NULL,                 -- UTC
  read_by_customer_at  DATETIME NULL,                 -- UTC
  request_key          VARCHAR(64) NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_request_key (request_key),
  KEY idx_job_created (job_id, created_at),
  KEY idx_unread (author_type, read_by_owner_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_change_requests (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id              INT UNSIGNED NOT NULL,
  customer_id         INT UNSIGNED NOT NULL,
  kind                ENUM('reschedule','address','measurement','garment','other') NOT NULL,
  payload             JSON NULL,
  measurement_set_id  INT UNSIGNED NULL,
  appointment_id      INT UNSIGNED NULL,
  status              ENUM('open','approved','declined','withdrawn') NOT NULL DEFAULT 'open',
  owner_response      VARCHAR(500) NULL,
  price_effect        DECIMAL(12,2) NULL,             -- signed change to the price, shown to the client
  date_effect         DATE NULL,                      -- new promised date, shown to the client
  decided_by          INT UNSIGNED NULL,
  decided_at          DATETIME NULL,                  -- UTC
  request_key         VARCHAR(64) NOT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_request_key (request_key),
  KEY idx_job_status (job_id, status),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_feedback (
  id                        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id                    INT UNSIGNED NOT NULL,
  customer_id               INT UNSIGNED NOT NULL,
  rating                    TINYINT UNSIGNED NULL,
  comment                   TEXT NULL,
  contact_ok                TINYINT(1) NOT NULL DEFAULT 0,
  publish_consent           ENUM('no','anonymous','first_name') NOT NULL DEFAULT 'no',
  photo_consent             TINYINT(1) NOT NULL DEFAULT 0,
  publish_wording           TEXT NULL,                -- the wording shown when consent was given
  photo_wording             TEXT NULL,
  follow_up                 ENUM('none','open','done') NOT NULL DEFAULT 'none',
  published_testimonial_id  INT UNSIGNED NULL,
  request_key               VARCHAR(64) NULL,
  created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_job (job_id),
  UNIQUE KEY uq_request_key (request_key),
  KEY idx_follow_up (follow_up)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Proposed wording, not yet confirmed by the owner (editable in Settings).
INSERT IGNORE INTO settings (skey, svalue) VALUES
  ('feedback_publish_wording', 'May Herit Clothing share your comment on its website or social pages? Choose not at all, without your name, or with your first name only. You can change your mind at any time by messaging us.'),
  ('feedback_photo_wording', 'May Herit Clothing show photos of your finished garment on its website or social pages? We only use photos you agree to, and you can change your mind at any time by messaging us.');
