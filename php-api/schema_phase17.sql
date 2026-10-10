-- HeritOS — Phase 17 migration. Additive only; safe to re-run on a live DB.
-- Non-guessable public references (finding A06). Staff codes (ORD-0042,
-- HC-0042) stay as they are; customers look orders up with a separate random
-- public_ref instead, so one code never reveals another order.
--
-- Import via phpMyAdmin AFTER schema_phase16.sql, and BEFORE uploading the
-- matching store.php, account.php and orders.php. Uses MariaDB's
-- `ADD COLUMN IF NOT EXISTS` / `ADD UNIQUE KEY IF NOT EXISTS`, like phases 2-16.
--
-- Alphabet: 23456789ABCDEFGHJKMNPQRSTUVWXYZ (31 characters, no 0/O or 1/I/L),
-- length 10. New rows get a reference from PHP random_int (php-api/_lib.php).
-- The backfill below uses SQL RAND(), which is weaker than random_int, so rows
-- that already exist get usable but less unpredictable references. Lookups also
-- need the matching phone and are throttled per IP.

-- ── Retail orders ───────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS public_ref CHAR(10) NULL AFTER code;

UPDATE orders SET public_ref = CONCAT(
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1))
WHERE public_ref IS NULL;

ALTER TABLE orders
  ADD UNIQUE KEY IF NOT EXISTS uniq_public_ref (public_ref);

-- ── Tailoring jobs (customer access arrives in Phase 3; the reference is ready) ─
ALTER TABLE tailoring_orders
  ADD COLUMN IF NOT EXISTS public_ref CHAR(10) NULL AFTER code;

UPDATE tailoring_orders SET public_ref = CONCAT(
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1),
  SUBSTRING('23456789ABCDEFGHJKMNPQRSTUVWXYZ', FLOOR(1 + RAND() * 31), 1))
WHERE public_ref IS NULL;

ALTER TABLE tailoring_orders
  ADD UNIQUE KEY IF NOT EXISTS uniq_public_ref (public_ref);

