-- HeritOS: Phase 26 migration (Phase 4 website CMS and images).
-- Additive; safe to re-run. Import via phpMyAdmin AFTER schema_phase25.sql.
--
-- 1. media_assets: website images. Only re-encoded variants are stored (in the
--    public uploads folder); the uploaded original never is. Alt text is
--    required before anything using the image can be published.
-- 2. cms_items: services, portfolio projects, FAQs, policies and pages. Each row
--    keeps three copies of its content: `live` (public while status is
--    'published'), `draft` (unpublished edits) and `prev` (one earlier live
--    version, for rollback). Slugs are stable: once an item has been published
--    its slug never changes. Portfolio consent flags and any client link live in
--    the JSON and are never sent to the public site.
-- 3. Nothing is seeded: empty means hidden on the public site. The business
--    profile lives in `settings` (business_* keys, socials, journal_enabled),
--    all empty until the owner fills them in.
-- 4. Invented offers: the HERIT10 welcome code and the FREESHIP code that
--    schema_phase5.sql used to seed are switched off when they were never used
--    (owner decision: nothing invented). The owner can switch a code back on in
--    Coupons (re-running this file switches an unused one off again). Rows that
--    were used are left alone.
--
-- Dry run (read-only), record the counts before importing:
--   SELECT code, active, used FROM coupons WHERE code IN ('HERIT10','FREESHIP');

CREATE TABLE IF NOT EXISTS media_assets (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  base_name    CHAR(32) NOT NULL,                     -- random hex; files are <base>-w<width>.<ext>
  width        INT UNSIGNED NOT NULL,
  height       INT UNSIGNED NOT NULL,
  variants     JSON NOT NULL,                         -- {"webp":{"800":"…","1600":"…"},"jpg":{"1600":"…"}}
  alt_text     VARCHAR(250) NULL,
  caption      VARCHAR(250) NULL,
  sha256       CHAR(64) NOT NULL,                     -- of the uploaded file, to spot repeats
  bytes        INT UNSIGNED NOT NULL DEFAULT 0,
  mime_in      VARCHAR(20) NOT NULL,
  uploaded_by  INT UNSIGNED NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   DATETIME NULL,                         -- soft delete; refused while referenced
  PRIMARY KEY (id),
  UNIQUE KEY uq_base_name (base_name),
  KEY idx_sha (sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_items (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity            ENUM('service','project','faq','policy','page') NOT NULL,
  slug              VARCHAR(80) NOT NULL,             -- pages and policies: their fixed key
  status            ENUM('draft','published','unpublished') NOT NULL DEFAULT 'draft',
  sort              INT NOT NULL DEFAULT 0,
  live              JSON NULL,
  draft             JSON NULL,
  prev              JSON NULL,
  version           INT UNSIGNED NOT NULL DEFAULT 0,
  published_at      DATETIME NULL,                    -- UTC, first publication; locks the slug
  live_updated_at   DATETIME NULL,                    -- UTC, last change to `live`
  draft_updated_at  DATETIME NULL,                    -- UTC
  draft_updated_by  INT UNSIGNED NULL,
  created_by        INT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_entity_slug (entity, slug),
  KEY idx_entity_status (entity, status, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Switch off the seeded, never-used promotion codes, only where the coupons
-- table exists (it comes from schema_phase5.sql).
SET @has_coupons := (SELECT COUNT(*) FROM information_schema.TABLES
                      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coupons');
SET @sql := IF(@has_coupons > 0,
  'UPDATE coupons SET active = 0 WHERE code IN (''HERIT10'',''FREESHIP'') AND used = 0',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
