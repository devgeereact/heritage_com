-- HeritOS — Phase 10 migration. Additive only; safe to run on a live DB.
-- Reviews, ratings + photo UGC with moderation. Import via phpMyAdmin AFTER
-- schema_phase9.sql.

CREATE TABLE IF NOT EXISTS reviews (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_slug  VARCHAR(190) NOT NULL,
  product_name  VARCHAR(190) NULL,
  customer_id   INT UNSIGNED NULL,
  author_name   VARCHAR(160) NOT NULL,
  rating        TINYINT NOT NULL DEFAULT 5,          -- 1..5
  title         VARCHAR(190) NULL,
  body          TEXT NULL,
  photo_url     VARCHAR(500) NULL,                   -- optional UGC image
  verified      TINYINT(1) NOT NULL DEFAULT 0,       -- bought this piece
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  response      TEXT NULL,                           -- brand reply
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_slug (product_slug),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
