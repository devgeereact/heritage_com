-- HeritOS: Phase 28 migration (home hero slides, D-023).
-- Additive; safe to re-run. Import via phpMyAdmin AFTER schema_phase27.sql.
--
-- 1. cms_items.entity gains 'slide': the slides of the full-screen home hero,
--    edited in Website > Hero slides with the same draft, preview, publish,
--    rollback and reorder as services. Each slide holds a label, an eyebrow,
--    a headline, a short lead, a photograph (with alt text) and an optional
--    button (text and an internal path such as /services). Nothing is seeded:
--    with no published slide the home hero is built from the home page and the
--    services that have a photograph, as before.
--
-- Dry run (read-only), record the result before importing:
--   SHOW COLUMNS FROM cms_items LIKE 'entity';

ALTER TABLE cms_items
  MODIFY entity ENUM('service','project','faq','policy','page','slide') NOT NULL;
