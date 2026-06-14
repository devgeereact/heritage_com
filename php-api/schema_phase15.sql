-- HeritOS — Phase 15 migration. Additive only; safe to run on a live DB.
-- Product Q&A (reuses the reviews table with a kind + answer) + an NPS survey.
-- Import via phpMyAdmin AFTER schema_phase14.sql.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS kind   ENUM('review','question') NOT NULL DEFAULT 'review' AFTER product_name,
  ADD COLUMN IF NOT EXISTS answer TEXT NULL AFTER response;

CREATE TABLE IF NOT EXISTS nps_responses (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NULL,
  order_code  VARCHAR(20) NULL,
  score       TINYINT NOT NULL,                 -- 0..10
  comment     VARCHAR(500) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_score (score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
