-- HeritOS — Phase 16 migration. Additive only; safe to run on a live DB.
-- Content hub foundation: public Blog (Journal) + curated Testimonials.
-- Import via phpMyAdmin AFTER schema_phase15.sql.

CREATE TABLE IF NOT EXISTS blog_posts (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(160) NOT NULL,
  title        VARCHAR(200) NOT NULL,
  excerpt      VARCHAR(400) NULL,
  body         MEDIUMTEXT NULL,                 -- HTML
  category     VARCHAR(60) NULL,                -- e.g. Heritage, Craft, Behind the seams
  tile         VARCHAR(40) NOT NULL DEFAULT 'hc-tile-mixed',  -- fabric-motif cover
  tags         VARCHAR(255) NULL,               -- comma-separated; doubles as hashtag seed
  status       ENUM('draft','published') NOT NULL DEFAULT 'draft',
  author       VARCHAR(120) NULL,
  published_at DATETIME NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_slug (slug),
  KEY idx_status_pub (status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS testimonials (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(120) NOT NULL,
  location   VARCHAR(120) NULL,
  quote      TEXT NOT NULL,
  rating     TINYINT NOT NULL DEFAULT 5,        -- 1..5
  tile       VARCHAR(40) NOT NULL DEFAULT 'hc-tile-ankara',  -- avatar motif
  featured   TINYINT(1) NOT NULL DEFAULT 1,
  status     ENUM('published','hidden') NOT NULL DEFAULT 'published',
  sort       INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status_sort (status, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
